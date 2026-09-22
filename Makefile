.PHONY: build test typecheck clean

build:
	pnpm build

test:
	pnpm test

typecheck:
	pnpm typecheck

clean:
	rm -rf dist
