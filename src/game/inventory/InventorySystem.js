import { EventEmitter } from 'events';
import Logger from '../../utils/Logger';

class InventorySlot {
    constructor(type, maxStack = 1) {
        this.type = type;
        this.item = null;
        this.count = 0;
        this.maxStack = maxStack;
    }

    canAcceptItem(item) {
        return item.type === this.type && 
               (!this.item || (this.item.id === item.id && this.count < this.maxStack));
    }

    addItem(item, count = 1) {
        if (!this.canAcceptItem(item)) return 0;

        const spaceLeft = this.maxStack - this.count;
        const amountToAdd = Math.min(count, spaceLeft);

        if (!this.item) {
            this.item = item;
        }
        this.count += amountToAdd;
        return amountToAdd;
    }

    removeItem(count = 1) {
        if (!this.item) return 0;

        const amountToRemove = Math.min(count, this.count);
        this.count -= amountToRemove;

        if (this.count === 0) {
            this.item = null;
        }

        return amountToRemove;
    }

    clear() {
        this.item = null;
        this.count = 0;
    }
}

class InventorySystem extends EventEmitter {
    constructor() {
        super();
        this.slots = new Map();
        this.quickSlots = new Map();
        this.maxWeight = 100;
        this.currentWeight = 0;
        this.initialized = false;
    }

    init(config) {
        try {
            this.setupSlots(config);
            this.setupQuickSlots();
            this.initialized = true;
            Logger.info('Inventory system initialized');
        } catch (error) {
            Logger.error('Failed to initialize inventory system:', error);
            throw error;
        }
    }

    setupSlots(config) {
        // Primary weapon slots
        this.slots.set('primary1', new InventorySlot('weapon'));
        this.slots.set('primary2', new InventorySlot('weapon'));

        // Secondary weapon slot
        this.slots.set('secondary', new InventorySlot('weapon'));

        // Melee weapon slot
        this.slots.set('melee', new InventorySlot('melee'));

        // Equipment slots
        this.slots.set('lethal', new InventorySlot('lethal', 3));
        this.slots.set('tactical', new InventorySlot('tactical', 2));

        // Armor slots
        this.slots.set('helmet', new InventorySlot('helmet'));
        this.slots.set('vest', new InventorySlot('vest'));

        // General inventory slots
        for (let i = 0; i < (config.inventorySize || 20); i++) {
            this.slots.set(`inventory${i}`, new InventorySlot('any'));
        }
    }

    setupQuickSlots() {
        // Quick access slots for weapons and equipment
        this.quickSlots.set(1, 'primary1');
        this.quickSlots.set(2, 'primary2');
        this.quickSlots.set(3, 'secondary');
        this.quickSlots.set(4, 'melee');
        this.quickSlots.set(5, 'lethal');
        this.quickSlots.set(6, 'tactical');
    }

    addItem(item, count = 1, preferredSlot = null) {
        try {
            let remainingCount = count;

            // Try preferred slot first
            if (preferredSlot && this.slots.has(preferredSlot)) {
                const slot = this.slots.get(preferredSlot);
                if (slot.canAcceptItem(item)) {
                    const added = slot.addItem(item, remainingCount);
                    remainingCount -= added;
                    this.updateWeight();
                    this.emit('itemAdded', { item, slot: preferredSlot, count: added });
                }
            }

            // If there's still items to add, try other slots
            if (remainingCount > 0) {
                for (const [slotId, slot] of this.slots) {
                    if (slotId === preferredSlot) continue;
                    if (slot.canAcceptItem(item)) {
                        const added = slot.addItem(item, remainingCount);
                        remainingCount -= added;
                        this.updateWeight();
                        this.emit('itemAdded', { item, slot: slotId, count: added });
                        if (remainingCount === 0) break;
                    }
                }
            }

            return count - remainingCount;
        } catch (error) {
            Logger.error('Error adding item to inventory:', error);
            return 0;
        }
    }

    removeItem(slotId, count = 1) {
        try {
            const slot = this.slots.get(slotId);
            if (!slot || !slot.item) return 0;

            const removed = slot.removeItem(count);
            if (removed > 0) {
                this.updateWeight();
                this.emit('itemRemoved', { item: slot.item, slot: slotId, count: removed });
            }
            return removed;
        } catch (error) {
            Logger.error('Error removing item from inventory:', error);
            return 0;
        }
    }

    moveItem(fromSlotId, toSlotId, count = 1) {
        const fromSlot = this.slots.get(fromSlotId);
        const toSlot = this.slots.get(toSlotId);

        if (!fromSlot || !toSlot || !fromSlot.item) return false;

        if (toSlot.canAcceptItem(fromSlot.item)) {
            const moveCount = Math.min(count, fromSlot.count);
            const added = toSlot.addItem(fromSlot.item, moveCount);
            if (added > 0) {
                fromSlot.removeItem(added);
                this.emit('itemMoved', { 
                    item: fromSlot.item, 
                    fromSlot: fromSlotId, 
                    toSlot: toSlotId, 
                    count: added 
                });
                return true;
            }
        }
        return false;
    }

    swapItems(slotId1, slotId2) {
        const slot1 = this.slots.get(slotId1);
        const slot2 = this.slots.get(slotId2);

        if (!slot1 || !slot2) return false;

        // Check if items can be placed in the respective slots
        if ((slot1.item && !slot2.canAcceptItem(slot1.item)) ||
            (slot2.item && !slot1.canAcceptItem(slot2.item))) {
            return false;
        }

        // Perform swap
        const tempItem = slot1.item;
        const tempCount = slot1.count;
        slot1.item = slot2.item;
        slot1.count = slot2.count;
        slot2.item = tempItem;
        slot2.count = tempCount;

        this.emit('itemsSwapped', { slot1: slotId1, slot2: slotId2 });
        return true;
    }

    getQuickSlotItem(quickSlotNumber) {
        const slotId = this.quickSlots.get(quickSlotNumber);
        if (!slotId) return null;

        const slot = this.slots.get(slotId);
        return slot ? slot.item : null;
    }

    updateWeight() {
        this.currentWeight = 0;
        for (const slot of this.slots.values()) {
            if (slot.item) {
                this.currentWeight += (slot.item.weight || 0) * slot.count;
            }
        }
        this.emit('weightChanged', this.currentWeight);
    }

    isOverweight() {
        return this.currentWeight > this.maxWeight;
    }

    clear() {
        for (const slot of this.slots.values()) {
            slot.clear();
        }
        this.currentWeight = 0;
        this.emit('inventoryCleared');
    }

    getInventoryState() {
        const state = {};
        for (const [slotId, slot] of this.slots) {
            state[slotId] = {
                item: slot.item ? { ...slot.item } : null,
                count: slot.count
            };
        }
        return state;
    }

    loadInventoryState(state) {
        this.clear();
        for (const [slotId, slotState] of Object.entries(state)) {
            const slot = this.slots.get(slotId);
            if (slot && slotState.item) {
                slot.item = slotState.item;
                slot.count = slotState.count;
            }
        }
        this.updateWeight();
        this.emit('inventoryLoaded');
    }

    dispose() {
        this.clear();
        this.slots.clear();
        this.quickSlots.clear();
        this.removeAllListeners();
        this.initialized = false;
    }
}

export default new InventorySystem(); 