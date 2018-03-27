cmake_minimum_required(VERSION 3.4)
project(vector_tile_js LANGUAGES CXX C)
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Werror")

include(cmake/mason.cmake)

mason_use(vtzero VERSION 1.0.0 HEADER_ONLY)
mason_use(protozero VERSION 1.6.1 HEADER_ONLY)

add_library(vtzero_wasm SHARED src/vectortile.cpp)
# "clang++: error: argument unused during compilation: '-shared'"
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wno-unused-command-line-argument")

set_target_properties(vtzero_wasm PROPERTIES
    SUFFIX ".js"
    # TODO: somehow tell cmake to treat src/prelude.js as a make dependency
    LINK_FLAGS "--bind --pre-js ${CMAKE_CURRENT_SOURCE_DIR}/src/prelude.js -s WASM=1"
)

target_add_mason_package(vtzero_wasm PRIVATE protozero)
target_add_mason_package(vtzero_wasm PRIVATE vtzero)

