FROM wiremock/wiremock:3.9.1

# CASE-002 Level-2 private control-plane stub.
# Keep the tested WireMock runtime pinned and bake the repository mapping into
# the image so deployments do not depend on ephemeral admin-API mutations.
COPY factory/mock/wiremock/mappings/control-plane.json /home/wiremock/mappings/control-plane.json
