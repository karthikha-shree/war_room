const mongoose =require("mongoose");

// bottom up architecture

// Each comment:
const commentSchema =new mongoose.Schema({
    text:{
        type:String,
        required:true
    },      
    user:{
        type:String,//NEED TO REPLACE WITH USER ID 
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

// Comments live inside tasks, not alone.

const taskSchema =new mongoose.Schema({
    title:{
        type:String,    
        required:true
    },
    description:{
        type:String 
    },
    comments:[commentSchema],
});
// Each task:

// Has text

// Can have many comments

const columnSchema =new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    order:Number,
    tasks:[taskSchema]
});
// order helps us:

// Control column position

// Animate properly later

const boardSchema =new mongoose.Schema({
    title:{
        type:String,    
        required:true
    },
    columns:[columnSchema],
    createdAt:{
        type:Date,
        default:Date.now
    }
});
    // Each board has many columns

module.exports =mongoose.model("Board",boardSchema);
