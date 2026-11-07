output "ecs_cluster_arn" {
  description = "ARN of the ECS Fargate cluster"
  value       = aws_ecs_cluster.main.arn
}

output "alb_dns_name" {
  description = "Public DNS name of the application load balancer"
  value       = aws_lb.main.dns_name
}
