variable "tenancy_ocid" {
  type        = string
  description = "OCI tenancy OCID"
  default     = "ocid1.tenancy.oc1..aaaaaaaaqs3jqrrui5wufrk2f7ol7gye6b3ab5v53fxyl262jdn4hvn7crgq"
}

variable "user_ocid" {
  type        = string
  description = "OCI user OCID"
  default     = "ocid1.user.oc1..aaaaaaaal7rof2lmemhkiw6jwnroyscde6rkgu4sg5t67wzr7jyohywq2oza"
}

variable "api_fingerprint" {
  type        = string
  description = "Fingerprint of the API key registered in OCI Console"
}

variable "api_private_key_path" {
  type        = string
  description = "Path to the OCI API private key file"
  default     = "~/.oci/greyhook_key.pem"
}

variable "region" {
  type        = string
  description = "OCI region"
  default     = "ap-mumbai-1"
}

variable "compartment_id" {
  type        = string
  description = "OCI compartment OCID (defaults to root = tenancy OCID for free tier)"
  default     = "ocid1.tenancy.oc1..aaaaaaaaqs3jqrrui5wufrk2f7ol7gye6b3ab5v53fxyl262jdn4hvn7crgq"
}

variable "postgres_password" {
  type        = string
  description = "PostgreSQL password for greyhook database"
  sensitive   = true
}

variable "jwt_secret" {
  type        = string
  description = "JWT signing secret for the backend API"
  sensitive   = true
}
