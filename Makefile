.PHONY: build dev preview test clean

.FORCE: ;

HOST ?= 127.0.0.1
PORT ?= 27180
AW_SERVER_URL ?=

prebuild: node_modules/ static/logo.png static/logo.svg

build: prebuild
	npm run build

dev: prebuild
	AW_SERVER_URL="$(AW_SERVER_URL)" npm run dev -- --host "$(HOST)" --port "$(PORT)"

preview: prebuild
	npm run serve

static/logo.%: media/logo/logo.%
	@mkdir -p static
	cp $< $@

node_modules/: package-lock.json
	npm ci

uninstall:
	rm -r node_modules/

test:
	npm test

typing-coverage:
	npx typescript-coverage-report

clean:
	rm -rf node_modules dist

lint:
	npm run lint

lint-fix:
	npx eslint src test scripts vite.config.ts --fix
