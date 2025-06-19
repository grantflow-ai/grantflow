#!/usr/bin/env python3
import contextlib
import os
import sys
from typing import TypedDict

from google.api_core import exceptions
from google.cloud import pubsub_v1


class SubscriptionConfig(TypedDict):
    name: str
    push_endpoint: str


class TopicConfig(TypedDict):
    topic: str
    subscriptions: list[SubscriptionConfig]


def main() -> None:
    project_id = os.environ.get("PUBSUB_PROJECT_ID", "grantflow")

    publisher = pubsub_v1.PublisherClient()
    subscriber = pubsub_v1.SubscriberClient()

    topics_and_subscriptions: list[TopicConfig] = [
        {
            "topic": "file-indexing",
            "subscriptions": [
                {
                    "name": "file-indexing-subscription",
                    "push_endpoint": "http://indexer:8000/",
                }
            ],
        },
        {
            "topic": "url-crawling",
            "subscriptions": [
                {
                    "name": "url-crawling-subscription",
                    "push_endpoint": "http://crawler:8000/",
                }
            ],
        },
        {
            "topic": "rag-processing",
            "subscriptions": [
                {
                    "name": "rag-processing-subscription",
                    "push_endpoint": "http://rag:8000/",
                }
            ],
        },
        {
            "topic": "frontend-notifications",
            "subscriptions": [],
        },
    ]

    for config in topics_and_subscriptions:
        topic_name = config["topic"]
        topic_path = publisher.topic_path(project_id, topic_name)

        try:
            publisher.create_topic(request={"name": topic_path})
        except exceptions.AlreadyExists:
            pass
        except Exception:
            sys.exit(1)

        for sub_config in config["subscriptions"]:
            subscription_name = sub_config["name"]
            subscription_path = subscriber.subscription_path(project_id, subscription_name)

            try:
                with contextlib.suppress(exceptions.NotFound):
                    subscriber.delete_subscription(request={"subscription": subscription_path})

                request = {
                    "name": subscription_path,
                    "topic": topic_path,
                    "ack_deadline_seconds": 600,
                }

                if sub_config.get("push_endpoint"):
                    push_config = pubsub_v1.types.PushConfig(push_endpoint=sub_config["push_endpoint"])
                    request["push_config"] = push_config

                subscriber.create_subscription(request=request)
            except exceptions.AlreadyExists:
                pass
            except Exception:
                sys.exit(1)


if __name__ == "__main__":
    main()
