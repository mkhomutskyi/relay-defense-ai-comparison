# GPU memory on the HX 370

Verified on the running AMD server on 10 November 2026. These are the settings used on this 64 GB system, rather than a universal maximum or a configuration tested on every AMD APU.

## Reported layout

- Installed RAM: two 32 GB DDR5 modules, both reported as dual-rank and running at 5600 MT/s.
- Preallocated GPU memory reported by the AMD driver: 2 GiB.
- GPU-accessible system-memory budget, reported as GTT: 56 GiB.
- Model-serving LXC memory ceiling: 60,000 MiB, approximately 58.6 GiB. GPU device nodes are passed through to that container.

The CPU and Radeon 890M use the same physical DDR5. The preallocated GPU heap is part of that installed memory. GTT lets the GPU access additional system-RAM allocations dynamically. The reported heaps are allocation budgets, not a promise that their combined size is available to one model. The operating system, runtime, model context and other containers also consume memory. Container ceilings do not reserve separate physical RAM for each container.

## Active memory settings

The server currently boots with:

```text
amdgpu.gttsize=57344
ttm.pages_limit=14680064
ttm.page_pool_size=14680064
```

`57344` MiB is 56 GiB. The TTM values count pages; this server uses 4096-byte pages, so 14,680,064 pages also represent 56 GiB. `pages_limit` controls TTM's allocated-page limit. `page_pool_size` controls its reusable page pool; a high pool ceiling does not mean that amount is permanently reserved for a model.

Linux now documents `amdgpu.gttsize` as deprecated in favor of TTM sizing. It remains present and active in this recorded configuration. Do not treat the line as a required new setting on every kernel.

## Compatibility settings have a different purpose

The current boot also has `amdgpu.vm_update_mode=3`. It routes graphics and compute GPU page-table updates through the CPU. It was used in the Vulkan compatibility investigation; it does not increase the memory budget. The saved base GRUB command line contains the three memory settings above, while this additional option is present in the active boot.

Some recorded Vulkan trials also used `GGML_VK_PREFER_HOST_MEMORY=1` to change buffer placement on this shared-memory system. That was a runtime-specific setting, not an extra memory allocation or a claim that all backends used the same placement.

The practical benefit is room for larger local-model allocations from the installed RAM. Actual fit and performance depend on the runtime, weights, context and concurrent workloads.

Sources: [AMDGPU module parameters](https://docs.kernel.org/gpu/amdgpu/module-parameters.html), [TTM allocated-page limit](https://github.com/torvalds/linux/blob/master/drivers/gpu/drm/ttm/ttm_tt.c), [TTM page-pool implementation](https://github.com/torvalds/linux/blob/master/drivers/gpu/drm/ttm/ttm_pool.c). Device totals and active values were read from the running machine.
