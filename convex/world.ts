import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const createWorld = mutation(async (ctx, { name, glTFXStorageId, assetStorageIds }: { name: string, glTFXStorageId: string, assetStorageIds: string[] }) => {
    return await ctx.db.insert("worlds", { 
        name, 
        glTFXStorageId, 
        assetStorageIds,
        createdAt: Date.now() 
    });
});

export const getWorld = query(async (ctx, { id }: { id: Id<"worlds"> }) => {
    const world = await ctx.db.get(id);
    if (world) {
        world.glTFXUrl = (await ctx.storage.getUrl(world.glTFXStorageId))!;
    }
    return world;
});