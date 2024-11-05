import { EventEmitter } from 'events';
import Logger from '../utils/Logger';
import { GAME_CONSTANTS } from '../config/constants';

class AIBehaviorTree {
    constructor(config) {
        this.root = this.buildTree(config);
        this.blackboard = new Map();
    }

    buildTree(config) {
        // Implement behavior tree structure based on config
        return new Sequence([
            new Condition('canSeePlayer'),
            new Selector([
                new Sequence([
                    new Condition('isInRange'),
                    new Action('attack')
                ]),
                new Action('pursue')
            ])
        ]);
    }

    update(context) {
        return this.root.execute(context, this.blackboard);
    }
}

class AIController {
    constructor(entity, config) {
        this.entity = entity;
        this.config = config;
        this.behaviorTree = new AIBehaviorTree(config.behavior);
        this.target = null;
        this.path = [];
        this.lastPathfindTime = 0;
        this.pathfindInterval = 500; // ms
        this.state = {
            isAlert: false,
            lastKnownPlayerPosition: null,
            patrolPoint: 0,
            combatStyle: config.combatStyle || 'aggressive'
        };
    }

    update(deltaTime, gameState) {
        // Update perception
        this.updatePerception(gameState);

        // Update behavior tree
        const context = {
            entity: this.entity,
            target: this.target,
            gameState,
            deltaTime
        };

        this.behaviorTree.update(context);

        // Update path if needed
        this.updatePathfinding(gameState);
    }

    updatePerception(gameState) {
        // Check for visible players
        const visiblePlayers = this.getVisiblePlayers(gameState);
        if (visiblePlayers.length > 0) {
            this.target = this.selectBestTarget(visiblePlayers);
            this.state.lastKnownPlayerPosition = this.target.position;
            this.state.isAlert = true;
        } else if (this.state.isAlert) {
            // Lost sight of player, maintain last known position
            this.target = null;
        }

        // Check for sounds
        this.processAudioCues(gameState);
    }

    getVisiblePlayers(gameState) {
        const players = [];
        const viewDistance = this.config.viewDistance || 50;
        const viewAngle = this.config.viewAngle || Math.PI / 2;

        for (const player of gameState.players.values()) {
            if (this.canSeeEntity(player, viewDistance, viewAngle)) {
                players.push(player);
            }
        }

        return players;
    }

    canSeeEntity(entity, maxDistance, maxAngle) {
        const distance = this.calculateDistance(this.entity.position, entity.position);
        if (distance > maxDistance) return false;

        const angle = this.calculateAngle(this.entity.rotation, entity.position);
        if (Math.abs(angle) > maxAngle) return false;

        return !this.hasLineOfSightObstruction(entity);
    }

    hasLineOfSightObstruction(target) {
        // Implement raycasting to check for obstacles
        return false;
    }

    selectBestTarget(visiblePlayers) {
        return visiblePlayers.reduce((best, current) => {
            const currentScore = this.evaluateTarget(current);
            const bestScore = best ? this.evaluateTarget(best) : -Infinity;
            return currentScore > bestScore ? current : best;
        }, null);
    }

    evaluateTarget(target) {
        const distance = this.calculateDistance(this.entity.position, target.position);
        const health = target.health / 100;
        const threat = target.weapon ? target.weapon.damage : 0;

        // Weight factors based on combat style
        const weights = this.getCombatStyleWeights();

        return (
            weights.distance * (1 - distance / this.config.viewDistance) +
            weights.health * (1 - health) +
            weights.threat * (threat / 100)
        );
    }

    getCombatStyleWeights() {
        switch (this.state.combatStyle) {
            case 'aggressive':
                return { distance: 0.3, health: 0.3, threat: 0.4 };
            case 'defensive':
                return { distance: 0.4, health: 0.4, threat: 0.2 };
            case 'balanced':
                return { distance: 0.33, health: 0.33, threat: 0.34 };
            default:
                return { distance: 0.33, health: 0.33, threat: 0.34 };
        }
    }

    updatePathfinding(gameState) {
        const now = performance.now();
        if (now - this.lastPathfindTime < this.pathfindInterval) return;

        this.lastPathfindTime = now;

        if (this.target) {
            this.path = this.findPath(this.entity.position, this.target.position);
        } else if (this.state.isAlert && this.state.lastKnownPlayerPosition) {
            this.path = this.findPath(this.entity.position, this.state.lastKnownPlayerPosition);
        } else {
            this.updatePatrolPath();
        }
    }

    findPath(start, end) {
        // Implement A* pathfinding
        return [];
    }

    updatePatrolPath() {
        if (this.path.length === 0) {
            const nextPoint = this.config.patrolPoints[this.state.patrolPoint];
            this.path = this.findPath(this.entity.position, nextPoint);
            this.state.patrolPoint = (this.state.patrolPoint + 1) % this.config.patrolPoints.length;
        }
    }

    processAudioCues(gameState) {
        // Process nearby sounds and update awareness
    }

    calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    calculateAngle(rotation, targetPos) {
        // Calculate angle between forward vector and target
        return 0;
    }
}

class AISystem extends EventEmitter {
    constructor() {
        super();
        this.agents = new Map();
        this.config = {
            maxAgents: 50,
            updateInterval: 16, // ms
            pathfindingBudget: 5 // ms
        };
    }

    createAgent(entity, config) {
        if (this.agents.size >= this.config.maxAgents) {
            Logger.warn('Maximum number of AI agents reached');
            return null;
        }

        const agent = new AIController(entity, config);
        this.agents.set(entity.id, agent);
        return agent;
    }

    removeAgent(entityId) {
        this.agents.delete(entityId);
    }

    update(deltaTime, gameState) {
        const startTime = performance.now();
        let timeUsed = 0;

        for (const agent of this.agents.values()) {
            if (timeUsed >= this.config.pathfindingBudget) {
                // Exceeded time budget, defer remaining updates
                break;
            }

            const updateStart = performance.now();
            agent.update(deltaTime, gameState);
            timeUsed += performance.now() - updateStart;
        }

        this.emit('updateComplete', {
            agentsUpdated: this.agents.size,
            timeUsed: performance.now() - startTime
        });
    }

    dispose() {
        this.agents.clear();
        this.removeAllListeners();
    }
}

export default new AISystem(); 