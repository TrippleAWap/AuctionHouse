import { ActionFormData } from "@minecraft/server-ui";
import { Database } from "./database";
import { world, system, ItemStack, Vector } from "@minecraft/server";

const auctions = new Database("auctions")
if (!auctions.has("auctions")) auctions.set("auctions", [])
const auctionList = auctions.get("auctions")
let form = new ActionFormData()
    .title(`§6Auction House`)
system.runInterval(() => {
    form = new ActionFormData()
    form.title(`§6Auction House`)
    for (const auction of auctionList) {
        form.button(`§a${auction.owner} §7- §e${auction.price}§7/§e${auction.price + 1000}`)
    }
    form.button(`§cBack`)
})

export const auctionHouseDB = new Database("auctionHouse")
const moneyObj = world.scoreboard.getObjective("money")

system.runInterval(() => {
    const auctionHouseEntities = world.getDimension(`overworld`).getEntities({ type: "csc:ac_house" });
    for (const entity of auctionHouseEntities) {
        const inventory = entity.getComponent('inventory').container;
        for (let i = 0; i < inventory.size; i++) {
            const auctionItem = auctionHouseDB.get("AuctionHouse")[i];
            if (!auctionItem) {
                const barrier = new ItemStack("minecraft:barrier", 1);
                barrier.nameTag = `§c `;
                inventory.setItem(i, barrier);
                continue;
            }

            const item = new ItemStack(auctionItem.typeId);
            item.nameTag = `§6${capitilizeFirstLetter(auctionItem.typeId.replace("minecraft:", "").replace("_", " "))}`;
            const lore = [
                `§7----------------`,
                `§6Seller: §e${auctionItem.seller}`,
                `§6Price: §e${auctionItem.price}`,
            ];
            if (auctionItem.lore) {
                for (const line in auctionItem.lore) {
                    lore.push(line);
                }
            }
            item.setLore(lore)
            item.amount = auctionItem.count;

            const slotItem = inventory.getSlot(i);
            if (slotItem?.amount < 1) {
                const playerList = world.getAllPlayers();
                const buyingPlayers = playerList.filter(player => {
                    const inv = player.getComponent('inventory').container;
                    for (let slot = 0; slot < inv.size; slot++) {
                        const playerItem = inv.getItem(slot);
                        if (!playerItem) continue;
                        if (playerItem.typeId === auctionItem.typeId) {
                            return true;
                        }
                    }
                    return false;
                });

                if (buyingPlayers.length < 1) {
                    continue;
                }

                const player = buyingPlayers[0];
                const playerInventory = player.getComponent('inventory').container;
                const playerMoneyScore = getScore(player, moneyObj.id)
                if (playerMoneyScore < auctionItem.price || auctionItem.creationData + 300 > Date.now()) {
                    player.sendMessage(`§cYou do not have enough money to buy this item.`);
                    player.runCommandAsync(`playsound note.bass @s ~~~ 10 1 10`);
                    player.setBack = true
                    continue
                }
                player.sendMessage(`§aYou have bought the item for §e$${auctionItem.price}§a.`);
                for (let slot = 0; slot < playerInventory.size; slot++) {
                    if (playerInventory.getSlot(slot).getLore().slice(3).toString() == auctionItem.lore) {
                        const newItem = new ItemStack(auctionItem.typeId, auctionItem.count);
                        newItem.nameTag = auctionItem.name;
                        newItem.setLore(auctionHouseDB.get("AuctionHouse")[i].lore);
                        playerInventory.setItem(slot, newItem);
                    }
                }
                player.runCommandAsync(`scoreboard players remove @s ${moneyObj.id} ${auctionItem.price}`);
                player.runCommandAsync(`scoreboard palyers add "§ ${auctionItem.seller}" ${moneyObj.id} ${auctionItem.price}`)
                player.runCommandAsync(`playsound note.pling @s ~~~ 10 1 10`);
                auctionHouseDB.get("AuctionHouse").splice(auctionHouseDB.get("AuctionHouse").findIndex(i => i.price === auctionItem.price && i.seller === auctionItem.seller), 1);
                auctionHouseDB.save();

            }

        }
        for (let i = 0; i < inventory.size; i++) {
            const auctionItem = auctionHouseDB.get("AuctionHouse")[i];
            if (!auctionItem) {
                const barrier = new ItemStack("minecraft:barrier", 1);
                barrier.nameTag = `§c `;
                inventory.setItem(i, barrier);
                continue;
            }

            const item = new ItemStack(auctionItem.typeId);
            const lore = [
                `§7----------------`,
                `§6Seller: §e${auctionItem.seller}`,
                `§6Price: §e${auctionItem.price}`,
                ...auctionItem.lore
            ];
            item.setLore(lore);
            item.amount = auctionItem.count;
            if (inventory.getSlot(i)?.amount < 1 || inventory.getSlot(i)?.typeId == "minecraft:barrier" && item) inventory.setItem(i, item);
        }
    }
});


world.events.beforeChat.subscribe(data => {
    if (data.message.startsWith(".ah")) {
        data.cancel = true
        const args = data.message.split(" ")
        if (args[1] === "add") {
            if (data.sender.getComponent('inventory').container.getSlot(data.sender.selectedSlot)?.amount < 1) return data.sender.sendMessage(`§cPlease hold an item.`)
            if (!args[2]) return data.sender.sendMessage(`§cPlease specify the cost of the item.`)
            auctionHouseDB.add("AuctionHouse", { seller: data.sender.name, typeId: data.sender.getComponent('inventory').container.getItem(data.sender.selectedSlot).typeId, count: data.sender.getComponent('inventory').container.getItem(data.sender.selectedSlot).amount, lore: data.sender.getComponent('inventory').container.getItem(data.sender.selectedSlot).getLore(), name: data.sender.getComponent('inventory').container.getItem(data.sender.selectedSlot).nameTag, price: Number(args[2]), creationData: Date.now() })
            data.sender.runCommandAsync(`replaceitem entity @s slot.weapon.mainhand 0 air 63`)
        }
        if (args[1] === "remove") {
            if (!args[2]) return data.sender.sendMessage(`§cPlease specify the cost of the item.`)
            const itemIndex = auctionHouseDB.get("AuctionHouse").splice(auctionHouseDB.get("AuctionHouse").findIndex(i => i.price === Number(args[2]) && i.seller === data.sender.name), 1)
            if (!itemIndex) return data.sender.sendMessage(`§cYou do not have an item with that price.`)
            const item = new ItemStack(itemIndex[0].typeId, itemIndex[0].count)
            item.lore = itemIndex[0].lore
            data.sender.dimension.spawnItem(item, data.sender.getHeadLocation())
        }
    }
})


function capitilizeFirstLetter(text) {
    return text[0].toUpperCase() + text.slice(1);
}

system.runInterval(() => {
    if (typeof auctionHouseDB.get("AuctionHouse") != "object") auctionHouseDB.set("AuctionHouse", [])
    for (const player of world.getPlayers()) {
        player.runCommandAsync(`clear @s minecraft:barrier`)
        if (!player.container2) player.container2 = []
        const inv = player.getComponent('inventory').container
        if (player.setBack) {
            for (var i = 0; i < inv.size; i++) inv.setItem(i, player.container2[i])
            player.setBack = false
            continue
        }
        player.container2 = []
        for (var i = 0; i < inv.size; i++) player.container2.push(inv.getItem(i))
    }
    world.getDimension(`overworld`).runCommandAsync(`execute as @e[type=csc:ac_house] at @s run kill @e[type=item,r=3]`)
    for (const part of world.scoreboard.getObjective(moneyObj.id).getParticipants()) {
        if (!part.displayName.startsWith("§ ")) continue
        for (const player of world.getPlayers()) {
            if (player.name == part.displayName.slice(2)) {
                player.runCommandAsync(`scoreboard players add @s ${moneyObj.id} ${getScore(part.displayName.slice(2), moneyObj.id)}`)
                player.runCommandAsync(`scoreboard players reset "§ ${player.name}" ${moneyObj.id}`)
            }
        }
    }
})

export function getScore(target, objective, rNaN = false) {
    try {
        const oB = world.scoreboard.getObjective(objective);
        if (typeof target == "string")
            return oB.getScore(
                oB.getParticipants().find((pT) => pT.displayName == target)
            );
        return oB.getScore(target.scoreboard);
    } catch {
        return rNaN ? NaN : 0;
    }
}


export function setScore(player, objective, value) {
    world.scoreboard.setScore(world.scoreboard.getObjective(objective), player.scoreboard, value);
    return value;
}
