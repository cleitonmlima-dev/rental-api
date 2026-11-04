#!/usr/bin/env python3
import json
import os

import boto3

region = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
sns = boto3.client("sns", endpoint_url="http://localhost:4566", region_name=region)
sqs = boto3.client("sqs", endpoint_url="http://localhost:4566", region_name=region)
topic_arn = sns.create_topic(Name="rental-proposal-status")["TopicArn"]

for status in ("NOVA", "ANALISE_CREDITO", "CONTRATO_EMITIDO", "ASSINADO", "ATIVO", "CANCELADA", "REPROVADA"):
    queue_name = "rental-proposal-" + status.lower().replace("_", "-")
    queue_url = sqs.create_queue(QueueName=queue_name)["QueueUrl"]
    queue_arn = sqs.get_queue_attributes(QueueUrl=queue_url, AttributeNames=["QueueArn"])["Attributes"]["QueueArn"]
    policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "sns.amazonaws.com"},
            "Action": "sqs:SendMessage",
            "Resource": queue_arn,
            "Condition": {"ArnEquals": {"aws:SourceArn": topic_arn}},
        }],
    }
    sqs.set_queue_attributes(QueueUrl=queue_url, Attributes={"Policy": json.dumps(policy)})
    sns.subscribe(
        TopicArn=topic_arn,
        Protocol="sqs",
        Endpoint=queue_arn,
        Attributes={
            "FilterPolicy": json.dumps({"status": [status]}),
            "FilterPolicyScope": "MessageAttributes",
            "RawMessageDelivery": "true",
        },
    )
