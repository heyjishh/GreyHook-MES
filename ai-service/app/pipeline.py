import structlog
from haystack import Document, Pipeline
from haystack.components.builders import ChatPromptBuilder
from haystack.components.embedders import (
    SentenceTransformersDocumentEmbedder,
    SentenceTransformersTextEmbedder,
)
from haystack.components.generators.chat import AnthropicChatGenerator
from haystack.components.retrievers.in_memory import InMemoryEmbeddingRetriever
from haystack.components.writers import DocumentWriter
from haystack.dataclasses import ChatMessage
from haystack.document_stores.in_memory import InMemoryDocumentStore
from haystack.utils import Secret

logger = structlog.get_logger(__name__)

_TEMPLATE = [
    ChatMessage.from_system(
        "You are an AI assistant for a manufacturing execution system (MES). "
        "Analyze OEE data, downtime events, and production telemetry to investigate issues. "
        "Answer based only on the provided factory data. Be specific about times, values, and root causes."
    ),
    ChatMessage.from_user(
        "Factory data:\n"
        "{% for doc in documents %}\n---\n{{ doc.content }}\n{% endfor %}\n\n"
        "Investigation question: {{ question }}\n\n"
        "Provide: 1) Direct answer 2) Evidence from the data 3) Root cause 4) Recommended actions."
    ),
]

_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


class InvestigationPipeline:
    def __init__(self, anthropic_api_key: str):
        self._api_key = anthropic_api_key

    def run(self, question: str, documents: list[Document]) -> dict:
        if not documents:
            documents = [Document(
                content="No factory data available for the requested time window.",
                meta={"source": "system"},
            )]

        doc_store = InMemoryDocumentStore()

        index_pipeline = Pipeline()
        index_pipeline.add_component("embedder", SentenceTransformersDocumentEmbedder(model=_EMBED_MODEL))
        index_pipeline.add_component("writer", DocumentWriter(document_store=doc_store))
        index_pipeline.connect("embedder.documents", "writer.documents")
        index_pipeline.run({"embedder": {"documents": documents}})

        query_pipeline = Pipeline()
        query_pipeline.add_component("text_embedder", SentenceTransformersTextEmbedder(model=_EMBED_MODEL))
        query_pipeline.add_component(
            "retriever", InMemoryEmbeddingRetriever(document_store=doc_store, top_k=10)
        )
        query_pipeline.add_component("prompt_builder", ChatPromptBuilder(template=_TEMPLATE))
        query_pipeline.add_component(
            "llm",
            AnthropicChatGenerator(
                api_key=Secret.from_token(self._api_key),
                model="claude-sonnet-4-6",
            ),
        )
        query_pipeline.connect("text_embedder.embedding", "retriever.query_embedding")
        query_pipeline.connect("retriever.documents", "prompt_builder.documents")
        query_pipeline.connect("prompt_builder.prompt", "llm.messages")

        result = query_pipeline.run({
            "text_embedder": {"text": question},
            "prompt_builder": {"question": question},
        })

        reply = result["llm"]["replies"][0]
        tokens = result["llm"].get("meta", [{}])[0].get("usage", {}).get("total_tokens", 0)
        return {"answer": reply.text, "tokens_used": tokens}
