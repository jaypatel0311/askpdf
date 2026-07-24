import { savePdf, loadPdf, deletePdf, getCollections } from '../lib/mongo';

const fileId = await savePdf(Buffer.from('not really a pdf'), 'smoke.txt');
const back = await loadPdf(fileId);
console.log('gridfs roundtrip:', back.toString() === 'not really a pdf' ? 'OK' : 'FAIL');
await deletePdf(fileId);

const { documents } = await getCollections();
await documents.insertOne({ filename: 'smoke', status: 'processing', uploadedAt: new Date() });
await documents.deleteMany({ filename: 'smoke' });
console.log('collections: OK');
process.exit(0);
