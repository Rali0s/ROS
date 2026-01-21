#!/bin/bash

# LimeOS Auto-Install Rollout Script
# Detects OS and installs dependencies for the LimeOS React application

echo "🌿 LimeOS Auto-Install Rollout 🌿"
echo "================================="

# Detect OS
OS=$(uname -s)
echo "Detected OS: $OS"

case "$OS" in
    Linux)
        echo "Installing dependencies for Linux..."
        # Update package list
        sudo apt update
        # Install Node.js and npm
        sudo apt install -y nodejs npm
        # Install build essentials if needed
        sudo apt install -y build-essential
        ;;
    Darwin)
        echo "Installing dependencies for macOS..."
        # Check if Homebrew is installed
        if ! command -v brew &> /dev/null; then
            echo "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        # Install Node.js
        brew install node
        # Install NGINX
        brew install nginx
        ;;
    *)
        echo "Unsupported OS: $OS"
        echo "Please install Node.js manually from https://nodejs.org/"
        exit 1
        ;;
esac

# Verify Node.js and npm installation
echo "Verifying Node.js and npm..."
node --version
npm --version

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Install Rust toolchain
echo "Installing Rust toolchain..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
echo "⚠️  WARNING: Be sure to add $HOME/.cargo/bin to your PATH to be able to run the installed binaries"
echo "   You can do this by adding the following line to your ~/.bashrc or ~/.zshrc:"
echo "   export PATH=\"\$HOME/.cargo/bin:\$PATH\""

# Install wasm-pack for WebAssembly compilation
echo "Installing wasm-pack..."
$HOME/.cargo/bin/cargo install wasm-pack

# Build the application
echo "Building LimeOS..."
npm run build

case "$OS" in
    Linux)
        # Deploy to web directory
        echo "Deploying to /var/www/os..."
        sudo mkdir -p /var/www/os
        sudo cp -r dist/* /var/www/os/
        sudo chown -R www-data:www-data /var/www/os

        # Install and configure NGINX
        echo "Installing NGINX..."
        sudo apt install -y nginx

        # Copy NGINX configuration
        echo "Configuring NGINX..."
        sudo cp nginx/os /etc/nginx/sites-available/os
        sudo ln -sf /etc/nginx/sites-available/os /etc/nginx/sites-enabled/
        sudo nginx -t
        sudo systemctl reload nginx

        # Install Python and Flask dependencies for enrollment service
        echo "Installing Python and Flask..."
        sudo apt install -y python3 python3-pip python3-venv
        python3 -m venv venv
        source venv/bin/activate
        pip install flask pyopenssl

        # Start enrollment service (assuming it's in security/)
        echo "Starting enrollment service..."
        cd security
        python3 enrol_server.py &
        cd ..
        ;;
    Darwin)
        # Deploy to web directory
        echo "Deploying to /usr/local/var/www/os..."
        sudo mkdir -p /usr/local/var/www/os
        sudo cp -r dist/* /usr/local/var/www/os/
        sudo chown -R $(whoami) /usr/local/var/www/os

        # Configure NGINX
        echo "Configuring NGINX..."
        sudo cp nginx/os_macos /usr/local/etc/nginx/sites-available/os
        sudo ln -sf /usr/local/etc/nginx/sites-available/os /usr/local/etc/nginx/sites-enabled/
        sudo nginx -t
        sudo brew services start nginx

        # Install Python and Flask
        echo "Installing Python and Flask..."
        brew install python
        pip3 install flask pyopenssl

        # Start enrollment service
        echo "Starting enrollment service..."
        cd security
        python3 enrol_server.py &
        cd ..
        ;;
esac

echo "✅ LimeOS installation complete!"
echo "NGINX is serving LimeOS at https://os.example.com"
echo "Enrollment service running on port 8080"