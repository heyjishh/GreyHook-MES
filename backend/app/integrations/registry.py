from __future__ import annotations

from app.integrations.base import BaseConnector, ConnectorConfig
from app.integrations.connectors.sap.pp import SAPPPConnector
from app.integrations.connectors.sap.mm import SAPMMConnector
from app.integrations.connectors.sap.qm import SAPQMConnector
from app.integrations.connectors.sap.pm import SAPPMConnector
from app.integrations.connectors.sap.sd import SAPSDConnector
from app.integrations.connectors.oracle.manufacturing import OracleManufacturingConnector
from app.integrations.connectors.oracle.wms import OracleWMSConnector
from app.integrations.connectors.oracle.quality import OracleQualityConnector


_SAP_MODULES: dict[str, type[BaseConnector]] = {
    "PP": SAPPPConnector,
    "MM": SAPMMConnector,
    "QM": SAPQMConnector,
    "PM": SAPPMConnector,
    "SD": SAPSDConnector,
}

_ORACLE_MODULES: dict[str, type[BaseConnector]] = {
    "MFG": OracleManufacturingConnector,
    "WMS": OracleWMSConnector,
    "QUALITY": OracleQualityConnector,
}

_SYSTEM_MODULES: dict[str, dict[str, type[BaseConnector]]] = {
    "sap_s4hana": _SAP_MODULES,
    "sap_ecc": _SAP_MODULES,
    "oracle_erp_cloud": _ORACLE_MODULES,
    "oracle_ebs": _ORACLE_MODULES,
}

MODULE_METADATA: dict[str, dict] = {
    "PP": {"display": "Production Planning (PP)", "direction": "bidirectional", "system": "SAP"},
    "MM": {"display": "Materials Management (MM)", "direction": "bidirectional", "system": "SAP"},
    "QM": {"display": "Quality Management (QM)", "direction": "bidirectional", "system": "SAP"},
    "PM": {"display": "Plant Maintenance (PM)", "direction": "bidirectional", "system": "SAP"},
    "SD": {"display": "Sales & Distribution (SD)", "direction": "erp_to_mes", "system": "SAP"},
    "MFG": {"display": "Oracle Manufacturing", "direction": "bidirectional", "system": "Oracle"},
    "WMS": {"display": "Oracle WMS / Inventory", "direction": "bidirectional", "system": "Oracle"},
    "QUALITY": {"display": "Oracle Quality", "direction": "bidirectional", "system": "Oracle"},
}


def available_modules(system_type: str) -> list[str]:
    return list(_SYSTEM_MODULES.get(system_type, {}).keys())


def build_connector(system_type: str, module_id: str, config: ConnectorConfig) -> BaseConnector:
    modules = _SYSTEM_MODULES.get(system_type, {})
    cls = modules.get(module_id)
    if cls is None:
        raise ValueError(f"Module '{module_id}' not available for system '{system_type}'")
    return cls(config)


def build_all_connectors(system_type: str, enabled_modules: list[str], config: ConnectorConfig) -> list[BaseConnector]:
    modules = _SYSTEM_MODULES.get(system_type, {})
    return [
        cls(config)
        for mid, cls in modules.items()
        if mid in enabled_modules
    ]
