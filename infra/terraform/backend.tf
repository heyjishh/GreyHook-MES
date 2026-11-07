terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "REPLACE-WITH-YOUR-TERRAFORM-STATE-BUCKET"
    key            = "greyhook-mes/pilot/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "REPLACE-WITH-YOUR-TERRAFORM-LOCK-TABLE"
    encrypt        = true
  }
}
