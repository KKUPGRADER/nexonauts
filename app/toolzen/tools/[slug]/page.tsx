import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Rating } from "@/components/ui/rating";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authOptions } from "app/api/auth/[...nextauth]/options";
import Navbar from "app/layouts/navbar";
import { getPublicToolBySlug, getRatingsAndReviews, getSimilarTools, postRatingAndReview, toggleBookmark } from "app/toolzen/lib/actions";
import { getAverageRating } from "app/toolzen/lib/utils";
import { ExternalLink, Hash, Star, Zap } from 'lucide-react';
import { getServerSession } from "next-auth/next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import MarkdownView from 'src/components/markdown/view';
import { RatingTypeWithId } from 'src/models/tool-rating';
import { formatNumber } from "src/utils/formaters";
import { BookMarkButton } from './bookmark';
import { PostReview } from "./post-review";
import RatingComponent, { RatingSkeletonLoader } from './rating';
import SimilarTools from "./similar-tools";


export default async function ToolPage({ params }: {
    params: {
        slug: string
    }
}) {

    const tool = await getPublicToolBySlug(params.slug);
    if (!tool) {
        return notFound();
    }
    const session = await getServerSession(authOptions);
    console.log(tool)


    const similarTools = await getSimilarTools(tool.categories);
    const ratings = await getRatingsAndReviews(tool._id);
    // console.log(ratings);

    async function publishRating(data: {
        rating: number,
        comment: string
    }) {
        "use server"
        try {
            if (!session || !session.user) {
                return Promise.reject("You need to be logged in to rate a tool")
            }
            const rating = await postRatingAndReview({
                toolId: tool._id!,
                userId: session.user._id!,
                rating: data.rating,
                comment: data.comment
            });
            return Promise.resolve(rating);
        } catch (e) {
            console.error(e);
            return Promise.reject(e);
        }

    }

    return (<>
        <Navbar />
        <main className="w-full mx-auto xl:max-w-7xl xl:px-0 rounded-lg overflow-hidden pt-20 space-y-4">

            <Card>
                <CardHeader className="flex flex-row gap-3 items-center flex-wrap">
                    <div className="flex-1 space-y-4">
                        <div className="flex flex-row gap-3 items-center justify-start">
                            <Image width={320} height={320} src={tool.coverImage} alt={tool.name}
                                className="rounded-lg backdrop-blur-lg border border-border max-w-40" />
                            <CardTitle title={tool.name} className="text-5xl font-bold">{tool.name}</CardTitle>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 ml-auto">
                        <BookMarkButton tool={tool} toggleBookmark={toggleBookmark} userId={session?.user?._id! || null} />
                        <Button
                            variant="gradient_blue"
                            className="rounded-full px-6 py-2"
                            asChild>
                            <Link href={tool.link + "?ref=nexonauts.com/toolzen"} target="_blank">
                                <span>
                                    Check it out
                                </span>
                                <ExternalLink className="inline-block ml-2 w-4 h-4" />
                            </Link>
                        </Button>
                    </div>
                    <div className="w-full space-y-4">
                        <div className="inline-flex flex-wrap gap-2 w-full items-center justify-start">
                            <Badge variant="default_light" size="sm">{tool.pricing_type}</Badge>
                            <div className="inline-flex items-center">
                                <Star className="w-4 h-4 fill-yellow-300 text-yellow-300 me-1" />
                                <p className="ms-2 text-sm font-bold text-gray-900 dark:text-white">{getAverageRating(ratings || [])}</p>
                                <span className="w-1 h-1 mx-1.5 bg-gray-500 rounded-full dark:bg-gray-400" />
                                <a href="#reviews" className="text-sm font-medium text-gray-900 underline hover:no-underline dark:text-white">{formatNumber(ratings.length)} reviews</a>
                            </div>
                        </div>
                        <div className="inline-flex flex-wrap gap-2 w-full items-center justify-start">
                            {tool.categories.map((category, index) => {
                                return <Badge key={category.slug + "_" + index} variant="success_light" className="font-medium">
                                    <Hash className="inline-block w-4 h-4" />
                                    {category.name}
                                </Badge>
                            })}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className=" border-y border-y-border pt-5 flex-col flex items-center justify-center gap-4">
                    {tool.bannerImage === "https://via.placeholder.com/920" ? <>
                        <Image width={900} height={384} src={tool.coverImage} alt={tool.name} className="w-full h-auto max-w-3xl  rounded-lg shadow-xl backdrop-blur-lg object-cover border border-border  mx-auto" />
                    </> : <>
                        <Image width={900} height={384} src={tool.bannerImage || tool.coverImage} alt={tool.name}
                            className="w-full h-auto max-w-3xl object-cover rounded-lg shadow-xl backdrop-blur-lg border border-border mx-auto aspect-video" />
                    </>}
                </CardContent>
            </Card>

            <Card id="overview">
                <CardHeader>
                    <CardTitle><Zap className="inline-block mr-2 w-5 h-5 text-teal-600" /> Overview</CardTitle>
                    <CardDescription>
                        Learn about <strong>{tool.name}</strong> and it's pricing model and every basic thing I should know before using it.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <MarkdownView className="prose dark:prose-invert prose-slate">{tool.description}</MarkdownView>
                </CardContent>
            </Card>
            <Card id="similar-tools">
                <CardHeader>
                    <CardTitle><Star className="inline-block mr-2 w-5 h-5 text-indigo-600" />
                        Similar Tools & Alternatives
                    </CardTitle>
                    <CardDescription>
                        You might also like these tools that are similar to <strong>{tool.name}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div>Loading...</div>}>
                        <SimilarTools tools={similarTools} />
                    </Suspense>
                </CardContent>
            </Card>
            <Card id="reviews">
                <CardHeader className="flex items-center w-full gap-2 flex-col md:flex-row">
                    <div>
                        <CardTitle>
                            <Star className="inline-block mr-2 w-6 h-6" />Ratings & Reviews
                        </CardTitle>
                        <CardDescription>
                            See what other users have to say about <strong>{tool.name}</strong>
                        </CardDescription>
                    </div>

                </CardHeader>
                <CardContent>
                    <div className="flex items-center mb-2 gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white/80">
                            {getAverageRating(ratings || [])} of 5
                        </span>
                        <Rating
                            count={5}
                            value={parseFloat(formatNumber(ratings.length))}
                            readonly={true}
                        />
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 inline-flex items-center">
                        <span className="font-semibold hover:underline cursor-pointer">
                            {formatNumber(ratings.length)}{" "} ratings
                        </span>
                        <span className="w-1 h-1 mx-1.5 bg-gray-500 rounded-full dark:bg-gray-400" />
                        We don't verify reviews.
                    </p>

                    <Tabs defaultValue="all-reviews" className="w-full mt-5">
                        <TabsList className="w-full">
                            <TabsTrigger value="all-reviews">
                                All Reviews
                            </TabsTrigger>
                            <TabsTrigger value="your-review">Your Review</TabsTrigger>
                        </TabsList>
                        <TabsContent value="all-reviews" className="py-4 space-y-4">
                            <Suspense fallback={<>
                                <RatingSkeletonLoader />
                                <RatingSkeletonLoader />
                                <RatingSkeletonLoader />
                            </>}>
                                {ratings.map((rating: RatingTypeWithId) => {
                                    return <RatingComponent key={rating._id} rating={rating} />
                                })}
                                {ratings.length === 0 && <div className="flex items-center justify-center gap-2">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        No reviews yet. Be the first to rate this tool
                                    </p>
                                </div>}
                            </Suspense>
                        </TabsContent>
                        <TabsContent value="your-review">
                            <div className="flex items-center justify-center gap-2 mx-auto">
                                {session && session.user ? <>
                                    <PostReview tool={tool} postRatingAndReview={publishRating} />
                                </> : <Button variant="gradient_blue" asChild>
                                    <Link href="/login">
                                        <span>Rate this tool</span>
                                    </Link>
                                </Button>}
                            </div>
                        </TabsContent>
                    </Tabs>

                </CardContent>
            </Card>
        </main>
    </>)
}