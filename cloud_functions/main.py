"""
Firebase Functions entry point for GrantFlow.AI

This module exports all Firebase functions for deployment.
"""

from src.auth_blocking.main import before_create, before_sign_in

__all__ = [
    "before_create",
    "before_sign_in",
]
