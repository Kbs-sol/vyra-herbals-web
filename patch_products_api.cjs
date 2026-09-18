const fs = require('fs');

const path = 'c:\\Users\\HP\\Desktop\\Short Film\\icarry-vyra-complete\\app\\api\\admin\\products\\route.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /body\.images = images;/,
  `body.images = images;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();
    if (body.view_count === undefined) body.view_count = 0;
    if (body.quantity === undefined) body.quantity = body.stock_quantity || null;`
);

content = content.replace(
  /updateData\.images = images;/,
  `updateData.images = images;
    updateData.updated_at = new Date().toISOString();
    if (updateData.stock_quantity !== undefined && updateData.quantity === undefined) {
      updateData.quantity = updateData.stock_quantity;
    }`
);

fs.writeFileSync(path, content, 'utf8');
console.log("Patched API successfully!");
