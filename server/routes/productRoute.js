import express from 'express';
import { upload } from '../configs/multer.js';
import authSeller from '../middlewares/authSeller.js';
import { addProduct, changeStock, productById, productList } from '../controllers/productcontroller.js';

const produtRouter = express.Router();

produtRouter.post('/add',upload.array('images'),authSeller,addProduct);
produtRouter.get('/list',productList);
produtRouter.get('/id',productById);
produtRouter.post('/stock',authSeller,changeStock);

export default produtRouter;
