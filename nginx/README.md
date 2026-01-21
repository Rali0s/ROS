# NGINX Configuration for ROS

## Setup Instructions

### Linux (Ubuntu/Debian)
1. Copy the `os` file to `/etc/nginx/sites-available/os`
2. Enable the site: `sudo ln -s /etc/nginx/sites-available/os /etc/nginx/sites-enabled/`
3. Ensure Let's Encrypt certificates are in place at `/etc/letsencrypt/live/os.example.com/`
4. Build the React app and copy to `/var/www/os`
5. Start the Flask enrollment service on port 8080
6. Test configuration: `sudo nginx -t`
7. Reload NGINX: `sudo systemctl reload nginx`

### macOS
1. Copy the `os_macos` file to `/usr/local/etc/nginx/sites-available/os`
2. Enable the site: `sudo ln -s /usr/local/etc/nginx/sites-available/os /usr/local/etc/nginx/sites-enabled/`
3. Ensure certificates are in `/usr/local/etc/nginx/ssl/os.example.com/`
4. Build the React app and copy to `/usr/local/var/www/os`
5. Start the Flask enrollment service on port 8080
6. Test configuration: `sudo nginx -t`
7. Start NGINX: `sudo brew services start nginx`

### Windows
1. Download and extract NGINX to `C:\nginx`
2. Copy the `os_windows` file to `C:\nginx\conf\sites-enabled\os`
3. Add `include sites-enabled/*.conf;` to `C:\nginx\conf\nginx.conf`
4. Ensure certificates are in `C:\nginx\ssl\os.example.com\`
5. Build the React app and copy to `C:\nginx\html\os`
6. Start the Flask enrollment service on port 8080
7. Start NGINX: `C:\nginx\nginx.exe`

## Features

- HTTPS termination with Let's Encrypt (Linux/macOS) or manual certs (Windows)
- React SPA serving with client-side routing
- Proxy for `/enroll` endpoint to Flask service
- Security headers for iframe embedding in Lumo
- Static asset caching

## Embedding

Use the provided HTML snippet in `embed.html` to embed the OS in Lumo.