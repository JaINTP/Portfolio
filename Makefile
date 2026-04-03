.PHONY: install lint build dev

install:
	@cd apps/portfolio && npm install

lint:
	@cd apps/portfolio && npm run lint

build:
	@cd apps/portfolio && npm run build

dev:
	@cd apps/portfolio && npm run dev
