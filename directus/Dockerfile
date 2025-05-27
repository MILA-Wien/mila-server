FROM directus/directus:11.7.2


USER root
RUN corepack enable
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh

USER node

# Install the directus-extension-sync
RUN pnpm install --save directus-extension-sync


