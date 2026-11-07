variable "region" {
  type        = string
  description = "AWS region for all resources"
  default     = "ap-south-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment label (e.g. pilot, staging, prod)"
  default     = "pilot"
}

variable "project_name" {
  type        = string
  description = "Project name used as a prefix for all resource names"
  default     = "greyhook-mes"
}

variable "db_password" {
  type        = string
  description = "PostgreSQL master password"
  sensitive   = true
}

variable "jwt_secret" {
  type        = string
  description = "JWT signing secret for the backend API"
  sensitive   = true
}

variable "anthropic_api_key" {
  type        = string
  description = "Anthropic API key used by the backend for AI investigations"
  sensitive   = true
}
