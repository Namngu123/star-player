-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "balance" INTEGER NOT NULL DEFAULT 500,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nation" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "atk" INTEGER NOT NULL,
    "def" INTEGER NOT NULL,
    "pas" INTEGER NOT NULL,
    "imp" INTEGER NOT NULL,
    "series" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "effect" TEXT,
    "avatarText" TEXT,
    "avatarTextColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "avatarColorMode" INTEGER NOT NULL DEFAULT 1,
    "avatarColor1" TEXT NOT NULL DEFAULT '#8b6914',
    "avatarColor2" TEXT NOT NULL DEFAULT '#8b6914',
    "avatarColor3" TEXT NOT NULL DEFAULT '#8b6914',
    "ownerId" INTEGER NOT NULL,
    "listedPrice" INTEGER,
    "floorHint" INTEGER,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineupSlot" (
    "id" SERIAL NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "cardId" TEXT NOT NULL,

    CONSTRAINT "LineupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "LineupSlot_userId_slotIndex_key" ON "LineupSlot"("userId", "slotIndex");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupSlot" ADD CONSTRAINT "LineupSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupSlot" ADD CONSTRAINT "LineupSlot_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;