import os

import firebase_admin
from firebase_admin import credentials

from app import settings

client_email = "client_email"
client_id = "client_id"
client_x509_cert_url = "client_x509_cert_url"

def init_firebase_credential():
    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": "ainee-f6194",
            "private_key_id": settings.firebase_private_key_id,
            "private_key": settings.firebase_private_key.replace("\\n", "\n"),
            "client_email": client_email,
            "client_id": client_id,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": client_x509_cert_url,
            "universe_domain": "googleapis.com"
        }
    )
    firebase_admin.initialize_app(cred)
