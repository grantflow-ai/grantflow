openapi: 3.1.0
info:
  title: GrantFlow Backend API
  description: GrantFlow Backend API through API Gateway
  version: 1.0.0
servers:
  - url: /

# Global backend configuration for all paths
x-google-backend:
  address: ${backend_url}
  protocol: h2

paths:
  # Add a simple proxy for all paths to the backend
  /{proxy+}:
    x-amazon-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-google-backend:
        address: ${backend_url}
        path_translation: APPEND_PATH_TO_ADDRESS
      responses:
        default:
          description: Response from backend
          content:
            application/json:
              schema:
                type: object

# Security configuration
components:
  securitySchemes:
    firebase:
      type: oauth2
      flows:
        implicit:
          authorizationUrl: ""
      x-google-issuer: "https://securetoken.google.com/${project_id}"
      x-google-jwks_uri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      x-google-audiences: "${project_id}"