const DEFAULTS = {
  left: 0,
  top: 0,
  width: 16,
  height: 16,
  rotate: 0,
  vFlip: false,
  hFlip: false,
  body: "",
  hidden: false
};

function mergeIconData(parent, child) {
  const result = {};
  if (Boolean(parent.hFlip) !== Boolean(child.hFlip)) result.hFlip = true;
  if (Boolean(parent.vFlip) !== Boolean(child.vFlip)) result.vFlip = true;
  const rotate = ((parent.rotate || 0) + (child.rotate || 0)) % 4;
  if (rotate) result.rotate = rotate;
  for (const key of Object.keys(DEFAULTS)) {
    if (["hFlip", "vFlip", "rotate"].includes(key)) {
      if (key in parent && !(key in result)) result[key] = DEFAULTS[key];
    } else if (key in child) result[key] = child[key];
    else if (key in parent) result[key] = parent[key];
  }
  return result;
}

function getIconData(iconSet, name) {
  const icons = iconSet?.icons || {};
  const aliases = iconSet?.aliases || {};
  let currentName = name;
  let current = {};
  const seen = new Set();
  while (!seen.has(currentName)) {
    seen.add(currentName);
    if (icons[currentName]) {
      current = mergeIconData(icons[currentName], current);
      return mergeIconData(iconSet, current);
    }
    const alias = aliases[currentName];
    if (!alias?.parent) return null;
    current = mergeIconData(alias, current);
    currentName = alias.parent;
  }
  return null;
}

function wrapBody(body, transforms) {
  if (!transforms.length) return body;
  return '<g transform="' + transforms.join(" ") + '">' + body + "</g>";
}

let idSequence = 0;
function replaceIds(body) {
  const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  if (!ids.length) return body;
  const suffix = "iconifySearch" + (++idSequence);
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    body = body.replace(new RegExp('(id=")' + escaped + '(")', "g"), "$1" + id + suffix + "$2");
    body = body.replace(new RegExp('([#;"(])' + escaped + '([)";.]|\\s)', "g"), "$1" + id + suffix + "$2");
  }
  return body;
}

export function renderIconSetSvg(iconSet, name, options = {}) {
  const icon = getIconData(iconSet, name);
  if (!icon) throw new Error("Iconify did not return icon data for " + name);
  const full = { ...DEFAULTS, ...icon };
  const box = { left: full.left, top: full.top, width: full.width, height: full.height };
  const transforms = [];
  let rotation = full.rotate;
  if (full.hFlip) {
    if (full.vFlip) rotation += 2;
    else {
      transforms.push("translate(" + (box.width + box.left) + " " + (0 - box.top) + ")", "scale(-1 1)");
      box.left = box.top = 0;
    }
  } else if (full.vFlip) {
    transforms.push("translate(" + (0 - box.left) + " " + (box.height + box.top) + ")", "scale(1 -1)");
    box.left = box.top = 0;
  }
  rotation = ((rotation % 4) + 4) % 4;
  if (rotation === 1) {
    const value = box.height / 2 + box.top;
    transforms.unshift("rotate(90 " + value + " " + value + ")");
  } else if (rotation === 2) {
    transforms.unshift("rotate(180 " + (box.width / 2 + box.left) + " " + (box.height / 2 + box.top) + ")");
  } else if (rotation === 3) {
    const value = box.width / 2 + box.left;
    transforms.unshift("rotate(-90 " + value + " " + value + ")");
  }
  if (rotation % 2) {
    [box.left, box.top] = [box.top, box.left];
    [box.width, box.height] = [box.height, box.width];
  }
  let body = replaceIds(wrapBody(full.body, transforms));
  if (!options.preserveColors && /^#[0-9a-f]{6}$/i.test(options.color || "")) {
    body = body.replace(/currentColor/gi, options.color);
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + box.width
    + '" height="' + box.height + '" viewBox="' + [box.left, box.top, box.width, box.height].join(" ")
    + '">' + body + "</svg>";
}
