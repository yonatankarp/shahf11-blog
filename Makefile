# חיה בסרט(ן) — local development
# Requires Node 20+.

.PHONY: help install dev build preview clean

help:
	@echo "Targets:"
	@echo "  make install   Install dependencies"
	@echo "  make dev       Run the dev server at http://localhost:4321/shahf11-blog/"
	@echo "  make build     Build the static site into dist/"
	@echo "  make preview   Serve the built site locally"
	@echo "  make clean     Remove build output and installed deps"

# Install only when package manifests change or node_modules is missing.
node_modules: package.json package-lock.json
	npm install
	@touch node_modules

install: node_modules

dev: node_modules
	npm run dev

build: node_modules
	npm run build

preview: build
	npm run preview

clean:
	rm -rf dist node_modules .astro public/images
