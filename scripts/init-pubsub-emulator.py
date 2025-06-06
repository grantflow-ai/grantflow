#!/usr/bin/env python3
import os
import sys

from google.api_core import exceptions
from google.cloud import pubsub_v1


def main():

    project_id = os.environ.get("PUBSUB_PROJECT_ID", "grantflow")

    publisher = pubsub_v1.PublisherClient()
    subscriber = pubsub_v1.SubscriberClient()


    topics_and_subscriptions = [
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
            "topic": "source-processing-notifications",
            "subscriptions": [
                {
                    "name": "source-processing-notifications-sub",
                    "push_endpoint": None,
                }
            ],
        },
    ]


    for config in topics_and_subscriptions:
        topic_name = config["topic"]
        topic_path = publisher.topic_path(project_id, topic_name)


        try:
            topic = publisher.create_topic(request={"name": topic_path})
            print(f"Created topic: {topic.name}")
        except exceptions.AlreadyExists:
            print(f"Topic already exists: {topic_path}")
        except Exception as e:
            print(f"Error creating topic {topic_name}: {e}")
            sys.exit(1)


        for sub_config in config["subscriptions"]:
            subscription_name = sub_config["name"]
            subscription_path = subscriber.subscription_path(project_id, subscription_name)

            try:

                try:
                    subscriber.delete_subscription(request={"subscription": subscription_path})
                    print(f"Deleted existing subscription: {subscription_path}")
                except exceptions.NotFound:
                    pass

                request = {
                    "name": subscription_path,
                    "topic": topic_path,
                    "ack_deadline_seconds": 600,
                }


                if sub_config.get("push_endpoint"):
                    push_config = pubsub_v1.types.PushConfig(push_endpoint=sub_config["push_endpoint"])
                    request["push_config"] = push_config

                subscription = subscriber.create_subscription(request=request)
                print(f"Created subscription: {subscription.name}")
            except exceptions.AlreadyExists:
                print(f"Subscription already exists: {subscription_path}")
            except Exception as e:
                print(f"Error creating subscription {subscription_name}: {e}")
                sys.exit(1)

    print("Pub/Sub initialization complete!")


if __name__ == "__main__":
    main()
