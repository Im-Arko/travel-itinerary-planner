"""Pinned MiniLM inference without importing the Torch/Transformers stack."""
from pathlib import Path
import os

FILES = ['onnx/model.onnx', 'tokenizer.json']


def snapshot_available(model, revision):
    repo = model if '/' in model else 'sentence-transformers/' + model
    cache = Path(os.environ.get('HF_HOME',Path.home()/'.cache'/'huggingface'))/'hub'/('models--'+repo.replace('/','--'))/'snapshots'/revision
    return all((cache/name).is_file() for name in FILES)


def download_snapshot(model, revision):
    from huggingface_hub import snapshot_download
    from huggingface_hub.errors import LocalEntryNotFoundError
    repo = model if '/' in model else 'sentence-transformers/' + model
    arguments = dict(repo_id=repo, revision=revision, allow_patterns=FILES)
    try:
        path = Path(snapshot_download(**arguments, local_files_only=True))
        if all((path/name).is_file() for name in FILES):
            return path
    except LocalEntryNotFoundError:
        pass
    return Path(snapshot_download(**arguments))


def pool_tokens(hidden, mask, normalize=True):
    import numpy as np
    weights = np.asarray(mask, dtype=np.float32)[..., None]
    pooled = (hidden * weights).sum(axis=1) / np.maximum(weights.sum(axis=1), 1e-9)
    if normalize:
        pooled = pooled / np.maximum(np.linalg.norm(pooled, axis=1, keepdims=True), 1e-12)
    return pooled


class MiniLMEmbedder:
    def __init__(self, model, revision):
        import onnxruntime as ort
        from tokenizers import Tokenizer
        path = download_snapshot(model, revision)
        self.tokenizer = Tokenizer.from_file(str(path/'tokenizer.json'))
        self.tokenizer.enable_truncation(max_length=256)
        self.tokenizer.enable_padding(pad_id=0, pad_token='[PAD]')
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(path/'onnx/model.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
        self.input_names = {item.name for item in self.session.get_inputs()}

    def encode(self, texts, show_progress_bar=False, normalize_embeddings=True):
        import numpy as np
        if not texts:
            return np.empty((0,384), dtype=np.float32)
        encoded = self.tokenizer.encode_batch(list(texts))
        values = {
            'input_ids': np.asarray([item.ids for item in encoded], dtype=np.int64),
            'attention_mask': np.asarray([item.attention_mask for item in encoded], dtype=np.int64),
            'token_type_ids': np.asarray([item.type_ids for item in encoded], dtype=np.int64),
        }
        hidden = self.session.run(None, {name:values[name] for name in self.input_names})[0]
        if hidden.ndim != 3 or hidden.shape[-1] != 384:
            raise ValueError('The configured model is not a compatible MiniLM export')
        return pool_tokens(hidden, values['attention_mask'], normalize_embeddings)
