FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8080/api
ARG VITE_AUTH_MODE=local
ARG VITE_MSAL_CLIENT_ID=
ARG VITE_MSAL_TENANT_ID=
ARG VITE_MSAL_API_SCOPE=
ARG VITE_MSAL_REDIRECT_URI=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTH_MODE=$VITE_AUTH_MODE \
    VITE_MSAL_CLIENT_ID=$VITE_MSAL_CLIENT_ID \
    VITE_MSAL_TENANT_ID=$VITE_MSAL_TENANT_ID \
    VITE_MSAL_API_SCOPE=$VITE_MSAL_API_SCOPE \
    VITE_MSAL_REDIRECT_URI=$VITE_MSAL_REDIRECT_URI

RUN npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*
COPY --from=build /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

ENTRYPOINT ["nginx", "-g", "daemon off;"]
