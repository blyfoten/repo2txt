# Use a lightweight nginx image
FROM nginx:alpine

# Copy the web application files to the nginx html directory
COPY . /usr/share/nginx/html

# Remove the Dockerfile from the web directory as it's not needed to serve
RUN rm -f /usr/share/nginx/html/Dockerfile

# Expose port 80
EXPOSE 80

# Start nginx with daemon off
CMD ["nginx", "-g", "daemon off;"] 