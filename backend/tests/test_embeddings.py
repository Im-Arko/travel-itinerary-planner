"""Padding and normalization are part of the published MiniLM contract."""
import unittest
import numpy as np
from unittest.mock import patch
from fastapi import HTTPException
from backend.app.services.embeddings import pool_tokens


class EmbeddingTests(unittest.TestCase):
    def test_padding_cannot_change_the_sentence_vector(self):
        hidden=np.array([[[2.,0.],[0.,2.],[1000.,1000.]]],dtype=np.float32)
        result=pool_tokens(hidden,np.array([[1,1,0]]))
        np.testing.assert_allclose(result,[[2**-.5,2**-.5]],rtol=1e-6)

    def test_empty_attention_remains_finite(self):
        result=pool_tokens(np.ones((1,2,3),dtype=np.float32),np.zeros((1,2)))
        self.assertTrue(np.isfinite(result).all())
        np.testing.assert_array_equal(result,np.zeros((1,3)))

    def test_missing_model_is_retryable_without_exposing_paths(self):
        from backend.app.schemas import vector_store
        with patch.object(vector_store,'_embedder',None), patch('backend.app.services.embeddings.MiniLMEmbedder',side_effect=OSError('private model path')):
            with self.assertRaises(HTTPException) as raised:
                vector_store._get_embedder()
        self.assertEqual(raised.exception.status_code,503)
        self.assertNotIn('private',raised.exception.detail)
