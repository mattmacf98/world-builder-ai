import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const createWorld = mutation(async (ctx, { name, glTFXStorageId, thumbnailStorageId, assetUriToStorageIds }: { name: string, glTFXStorageId: string, thumbnailStorageId: string, assetUriToStorageIds: { uri: string, storageId: string }[] }) => {
    return await ctx.db.insert("worlds", { 
        name, 
        thumbnailStorageId,
        glTFXStorageId, 
        assetUriToStorageIds,
        createdAt: Date.now() 
    });
});

export const getWorld = query(async (ctx, { id }: { id: Id<"worlds"> }) => {
    const world = await ctx.db.get(id);
    if (world) {
        world.glTFXUrl = (await ctx.storage.getUrl(world.glTFXStorageId))!;
        world.thumbnailUrl = (await ctx.storage.getUrl(world.thumbnailStorageId))!;
        const assetUriToUrls = [];
        for (const assetUriToStorageId of world.assetUriToStorageIds) {
            const url = await ctx.storage.getUrl(assetUriToStorageId.storageId);
            assetUriToUrls.push({ uri: assetUriToStorageId.uri, url: url! });
        }
        world.assetUriToUrls = assetUriToUrls;
    }
    return world;
});

export const getWorlds = query(async (ctx) => {
    const worlds = await ctx.db.query("worlds").collect();
    for (const world of worlds) {
        world.thumbnailUrl = (await ctx.storage.getUrl(world.thumbnailStorageId))!;
    }
    return worlds;
});