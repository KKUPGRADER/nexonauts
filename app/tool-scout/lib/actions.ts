"use server";
import dbConnect from "lib/dbConnect";
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import PublicTool, { IPublicTool, PublicToolPricingType, PublicToolTypeWithId } from 'src/models/tool';
import ToolRating, { RatingTypeWithId, rawRatingType } from 'src/models/tool-rating';



export async function getTools(query: string, currentPage: number, filter: {
    pricing_type: PublicToolPricingType | "all",
    category: string,
}): Promise<{
    tools: Partial<PublicToolTypeWithId>[],
    categories: {
        name: string;
        slug: string;
        _id: string;
    }[],
    totalPages: number,
    pricing_types: PublicToolPricingType[]
}> {
    await dbConnect();

    const resultsPerPage = 32;
    const skip = currentPage * resultsPerPage - resultsPerPage;

    const filterQuery = {
        $or: [
            { "slug": { $regex: query, $options: "i" } },
            { "name": { $regex: query, $options: "i" } },
            { "description": { $regex: query, $options: "i" } },
            { "categories.name": { $regex: query, $options: "i" } },
        ],
    } as unknown as any;
    if (filter.pricing_type && filter.pricing_type !== "all") {
        filterQuery["pricing_type"] = filter.pricing_type;
    }
    if (filter.category && filter.category !== "all") {
        filterQuery["categories.slug"] = filter.category;
    }

    const tools = await PublicTool.find(filterQuery)
        .sort({
            "createdAt": "desc",
        })
        .skip(skip)
        .limit(resultsPerPage)
        .select('name slug coverImage categories pricing_type')
        .exec();

    const categories = await PublicTool.aggregate([
        { $unwind: "$categories" },
        {
            $group: {
                _id: "$categories.slug",
                name: { $first: "$categories.name" },
                slug: { $first: "$categories.slug" },
            },
        },
        { $project: { _id: 0, name: 1, slug: 1 } },
        //  sort by name
        { $sort: { name: 1 } },
    ]);
    const pricing_types = await PublicTool.distinct("pricing_type");

    const totalPages = Math.ceil((await PublicTool.countDocuments(filterQuery)) / resultsPerPage);

    return {
        tools: JSON.parse(JSON.stringify(tools)),
        categories: JSON.parse(JSON.stringify(categories)),
        totalPages,
        pricing_types
    };

}

export async function getPublicToolBySlug(slug: string): Promise<PublicToolTypeWithId> {
    await dbConnect();
    const tool = await PublicTool.findOne({ slug, status: "published" || "approved" });
    return JSON.parse(JSON.stringify(tool));
}

export async function getPublicToolBySlugForRatingPage(slug: string): Promise<PublicToolTypeWithId> {
    await dbConnect();
    const tool = await PublicTool.findOne({ slug, status: "published" || "approved" })
        .select('name slug coverImage bookmarks categories pricing_type')
    return JSON.parse(JSON.stringify(tool));
}

export async function getSimilarTools(categories: PublicToolTypeWithId["categories"]): Promise<Partial<PublicToolTypeWithId>[]> {
    await dbConnect();
    const tools = await PublicTool.find({
        'categories.slug': { $in: categories.map(category => category.slug) },
        status: { $in: ["published", "approved"] }
    })
        .sort({ createdAt: -1 })
        .select('name slug coverImage categories pricing_type')
        .limit(6);
    return JSON.parse(JSON.stringify(tools));
}

export async function getRatingsAndReviews(id: string): Promise<RatingTypeWithId[]> {
    await dbConnect();
    const ratings = await ToolRating.find({ toolId: id })
        .sort({ createdAt: -1 })
        .select('rating comment createdAt')
        .populate('userId', 'name username profilePicture')
        .limit(5);

    return JSON.parse(JSON.stringify(ratings))
}

export async function getRatingsAndReviewsByPage(id: string, currentPage: number): Promise<{
    ratings: RatingTypeWithId[],
    hasMore: boolean
}> {
    await dbConnect();
    const ratings = await ToolRating.find({ toolId: id })
        .sort({ createdAt: -1 })
        .select('rating comment createdAt')
        .populate('userId', 'name username profilePicture')
        .limit(5)
        .skip((currentPage - 1) * 5);

    const totalRatings = await ToolRating.countDocuments({ toolId: id });
    if (totalRatings <= currentPage * 5) {
        return {
            ratings: JSON.parse(JSON.stringify(ratings)),
            hasMore: false
        }
    }
    return {
        ratings: JSON.parse(JSON.stringify(ratings)),
        hasMore: true
    }

}
export async function postRatingAndReview(data: rawRatingType): Promise<RatingTypeWithId> {
    await dbConnect();
    const rating = new ToolRating(data);
    await rating.save();
    return JSON.parse(JSON.stringify(rating));
}

export async function toggleBookmark(toolId: string, userId: string): Promise<boolean> {
    if (!userId || !toolId) {
        return Promise.reject("Invalid user or tool");
    }
    await dbConnect();
    const tool = await PublicTool.findById(toolId) as IPublicTool;
    if (!tool) {
        return Promise.reject("Invalid tool");
    }
    // Ensure tool.bookmarks is initialized as an empty array
    if (!tool.bookmarks) {
        tool.bookmarks = [];
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);
    if (tool.bookmarks.includes(userIdObj)) {
        tool.bookmarks = tool.bookmarks.filter((id) => id !== userIdObj);
        await tool.save();
        revalidatePath(`/toolzen/tools/${tool.slug}`, "page");
        return Promise.resolve(false);
    } else {
        tool.bookmarks.push(userIdObj);
        await tool.save();
        revalidatePath(`/toolzen/tools/${tool.slug}`, "page");
        return Promise.resolve(true);
    }
}