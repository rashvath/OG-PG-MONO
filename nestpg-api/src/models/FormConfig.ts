import { Schema, model } from 'mongoose'

const formFieldConfigSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    required: { type: Boolean, default: false },
  },
  { _id: false },
)

const formConfigSchema = new Schema(
  {
    formKey: { type: String, required: true, unique: true, index: true, trim: true },
    title: { type: String, required: true, trim: true },
    fields: { type: [formFieldConfigSchema], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

export const FormConfigModel = model('FormConfig', formConfigSchema)
