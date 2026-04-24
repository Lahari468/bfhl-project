const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());


function isValid(edge) {
    if (!edge.includes("->")) return false;

    const parts = edge.split("->");
    if (parts.length !== 2) return false;

    const [p, c] = parts;

    if (p.length !== 1 || c.length !== 1) return false;
    if (!/[A-Z]/.test(p) || !/[A-Z]/.test(c)) return false;
    if (p === c) return false;

    return true;
}

function processInput(data) {
    const seen = new Set();
    const duplicates = new Set();
    const validEdges = [];
    const invalid = [];

    for (let raw of data) {
        let edge = raw.trim();

        if (!isValid(edge)) {
            invalid.push(raw);
            continue;
        }

        if (seen.has(edge)) {
            duplicates.add(edge);
        } else {
            seen.add(edge);
            validEdges.push(edge);
        }
    }

    return {
        validEdges,
        invalid,
        duplicates: [...duplicates]
    };
}

function buildTree(node, map, visited = new Set()) {
    if (visited.has(node)) return {}; 

    visited.add(node);

    let obj = {};

    if (map[node]) {
        for (let child of map[node]) {
            obj[child] = buildTree(child, map, visited);
        }
    }

    return obj;
}

function detectCycle(node, map, visited, stack = new Set()) {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    stack.add(node);

    if (map[node]) {
        for (let child of map[node]) {
            if (detectCycle(child, map, visited, stack)) return true;
        }
    }

    stack.delete(node);
    return false;
}

function getDepth(node) {
    let max = 1;

    for (let key in node) {
        const depth = 1 + getDepth(node[key]);
        if (depth > max) max = depth;
    }

    return max;
}


function buildHierarchy(edges) {
    const parentMap = {};
    const childSet = new Set();

    for (let edge of edges) {
        const [p, c] = edge.split("->");

        if (!parentMap[p]) parentMap[p] = [];
        parentMap[p].push(c);

        childSet.add(c);
    }

    let roots = Object.keys(parentMap).filter(n => !childSet.has(n));

    if (roots.length === 0 && Object.keys(parentMap).length > 0) {
        roots = [Object.keys(parentMap)[0]];
    }

    const result = [];
    let cycleCount = 0;

    for (let root of roots) {
        const visited = new Set();
        const hasCycle = detectCycle(root, parentMap, visited);

        if (hasCycle) {
            result.push({
                root,
                tree: { [root]: {} },
                has_cycle: true
            });
            cycleCount++;
        } else {
            const tree = { [root]: buildTree(root, parentMap) };
            const depth = getDepth(tree[root]);

            result.push({
                root,
                tree,
                depth
            });
        }
    }

    return { result, cycleCount };
}

function generateSummary(data) {
    let maxDepth = 0;
    let largestRoot = "";
    let totalTrees = 0;

    for (let item of data.result) {
        if (!item.has_cycle) {
            totalTrees++;

            if (item.depth > maxDepth) {
                maxDepth = item.depth;
                largestRoot = item.root;
            } else if (item.depth === maxDepth) {
                if (largestRoot === "" || item.root < largestRoot) {
                    largestRoot = item.root;
                }
            }
        }
    }

    return {
        total_trees: totalTrees,
        total_cycles: data.cycleCount,
        largest_tree_root: largestRoot
    };
}

app.post('/bfhl', (req, res) => {
    const input = req.body.data || [];

    const cleaned = processInput(input);
    const hierarchy = buildHierarchy(cleaned.validEdges);
    const summary = generateSummary(hierarchy);

    res.json({
        user_id: "jayalahari_01052006",
        email_id: "jayalahari_kadiyala@srmap.edu.in",
        college_roll_number: "AP23110011034",
        hierarchies: hierarchy.result,
        invalid_entries: cleaned.invalid,
        duplicate_edges: cleaned.duplicates,
        summary: summary
    });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
