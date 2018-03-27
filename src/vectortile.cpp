#include <vtzero/vector_tile.hpp>
#include <iostream>

#include <emscripten.h>
#include <emscripten/bind.h>

namespace vtjs {

class Layer {
    vtzero::layer layer;
public:
    Layer(vtzero::layer layer_) : layer(layer_) {}

    std::uint32_t version() { return layer.version(); }
    std::string name() { return std::string(layer.name()); }
    std::uint32_t extent() { return layer.extent(); }
    std::size_t length() { return layer.num_features(); }
};

class VectorTile {
    std::string data;
    vtzero::vector_tile tile;
    std::vector<vtjs::Layer> layers;

public:
    VectorTile(std::string data_) :
        data(std::move(data_)),
        tile(vtzero::vector_tile{data})
    {
        tile.for_each_layer([&](vtzero::layer&& l) {
            layers.push_back(l);
            return true;
        });
    }

    vtjs::Layer layer(std::size_t i) { return layers[i]; }
    std::size_t num_layers() { return layers.size(); }
};

}

using namespace emscripten;

EMSCRIPTEN_BINDINGS(vtzero_binding) {
    class_<vtjs::VectorTile>("VectorTile")
        .constructor<std::string>()
        .function("num_layers", &vtjs::VectorTile::num_layers)
        .function("layer", &vtjs::VectorTile::layer);

    class_<vtjs::Layer>("Layer")
        .function("version", &vtjs::Layer::version)
        .function("name", &vtjs::Layer::name)
        .function("extent", &vtjs::Layer::extent)
        .function("length", &vtjs::Layer::name);
}
