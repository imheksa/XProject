-- AlterTable
ALTER TABLE "CompetitorSnapshot" ADD COLUMN     "totalLikes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalReplies" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRetweets" INTEGER NOT NULL DEFAULT 0;
