const fs = require('fs');
const path = 'c:\\Users\\HP\\Desktop\\Short Film\\icarry-vyra-complete\\app\\admin\\products\\page.tsx';

let content = fs.readFileSync(path, 'utf8');

const target = `const openAddModal = () => {
    setEditingProduct(null);
    setFormData({`;

const replacement = `const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      status: 'active',
      brand: 'Vyra Herbals',
      stock_quantity: '100',
      keywords: '',
      coupon: '',`;

content = content.replace(target, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log("Fixed openAddModal successfully!");
