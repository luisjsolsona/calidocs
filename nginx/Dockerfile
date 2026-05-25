FROM nginx:1.25-alpine

# Copia la configuración del proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia el frontend estático
COPY ../frontend /usr/share/nginx/html

EXPOSE 80
