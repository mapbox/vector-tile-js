.PHONY: build/libvtzero_wasm.js

build/libvtzero_wasm.js: build
	cd build && make VERBOSE=1

build: CMakeLists.txt
	cd build && \
		cmake -DCMAKE_TOOLCHAIN_FILE=../emscripten/cmake/Modules/Platform/Emscripten.cmake ..

clean:
	rm -rf build

