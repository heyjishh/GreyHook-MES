output "instance_public_ip" {
  value       = oci_core_instance.app.public_ip
  description = "Public IP of the GreyHook MES server"
}

output "ssh_command" {
  value       = "ssh -i ${path.module}/greyhook_ssh_key.pem ubuntu@${oci_core_instance.app.public_ip}"
  description = "SSH command to connect to the instance"
}

output "app_url" {
  value       = "http://${oci_core_instance.app.public_ip}:3000"
  description = "GreyHook MES dashboard URL"
}

output "ssh_private_key_path" {
  value       = "${path.module}/greyhook_ssh_key.pem"
  description = "Path to SSH private key"
}
