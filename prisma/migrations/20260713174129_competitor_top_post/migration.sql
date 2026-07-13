-- AlterTable
ALTER TABLE "CompetitorSnapshot" ADD COLUMN     "topPostId" TEXT,
ADD COLUMN     "topPostLikeCount" INTEGER,
ADD COLUMN     "topPostQuoteCount" INTEGER,
ADD COLUMN     "topPostReplyCount" INTEGER,
ADD COLUMN     "topPostRetweetCount" INTEGER,
ADD COLUMN     "topPostText" TEXT,
ADD COLUMN     "topPostedAt" TIMESTAMP(3);
