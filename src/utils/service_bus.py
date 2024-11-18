from azure.servicebus.aio import ServiceBusClient, ServiceBusSender

from src.utils.env import get_env
from src.utils.ref import Ref

ref = Ref[ServiceBusClient]()
sender_ref = Ref[ServiceBusSender]()


def get_service_bus_client() -> ServiceBusClient:
    """Get a service bus client.

    Returns:
        A service
    """
    if ref.value is None:
        ref.value = ServiceBusClient.from_connection_string(get_env("AZURE_SERVICE_BUS_CONNECTION_STRING"))
    return ref.value


def get_queue_sender(queue_name: str) -> ServiceBusSender:
    """Get a sender for a queue.

    Args:
        queue_name: The name of the queue.

    Returns:
        A sender for the queue.
    """
    if sender_ref.value is None:
        sender_ref.value = get_service_bus_client().get_queue_sender(queue_name)
    return sender_ref.value
