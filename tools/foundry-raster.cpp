// Offline triangle rasterizer for Foundry fallback art. The live game uses Three.js.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <limits>
#include <vector>

struct Vertex { float x, y, z, r, g, b; };

int main() {
    int size, triangles;
    if (!std::cin.read(reinterpret_cast<char*>(&size), sizeof(size)) ||
        !std::cin.read(reinterpret_cast<char*>(&triangles), sizeof(triangles)) ||
        size < 1 || size > 2048 || triangles < 0) return 1;
    std::vector<float> depth(size * size, std::numeric_limits<float>::infinity());
    std::vector<uint8_t> rgba(size * size * 4, 0);
    for (int n = 0; n < triangles; ++n) {
        Vertex v[3];
        if (!std::cin.read(reinterpret_cast<char*>(v), sizeof(v))) return 1;
        const auto [a, b, c] = v;
        const float area = (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
        if (std::abs(area) < .00001f) continue;
        const int left = std::max(0, int(std::floor(std::min({a.x,b.x,c.x}))));
        const int right = std::min(size-1, int(std::ceil(std::max({a.x,b.x,c.x}))));
        const int top = std::max(0, int(std::floor(std::min({a.y,b.y,c.y}))));
        const int bottom = std::min(size-1, int(std::ceil(std::max({a.y,b.y,c.y}))));
        for (int y=top; y<=bottom; ++y) for (int x=left; x<=right; ++x) {
            const float px=x+.5f-a.x, py=y+.5f-a.y;
            const float u=(px*(c.y-a.y)-py*(c.x-a.x))/area;
            const float w=((b.x-a.x)*py-(b.y-a.y)*px)/area;
            const float t=1-u-w;
            if (std::min({u,w,t})<0) continue;
            const float z=t*a.z+u*b.z+w*c.z;
            const int i=y*size+x;
            if (z>=depth[i]) continue;
            depth[i]=z;
            auto channel=[&](float p,float q,float r) {
                return uint8_t(std::clamp(t*p+u*q+w*r,0.f,255.f));
            };
            rgba[i*4]=channel(a.r,b.r,c.r);
            rgba[i*4+1]=channel(a.g,b.g,c.g);
            rgba[i*4+2]=channel(a.b,b.b,c.b);
            rgba[i*4+3]=255;
        }
    }
    std::cout.write(reinterpret_cast<char*>(rgba.data()),rgba.size());
}
