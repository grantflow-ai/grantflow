"""Tests for JSON relationships evaluation."""

from services.rag.src.dto import RelationshipPair
from services.rag.src.utils.evaluation.json.relationships import (
    check_relationships_completeness,
    evaluate_relationships_quality,
)


class TestRelationshipsQualityEvaluation:
    def test_evaluate_relationships_quality_high_quality(self) -> None:
        """Test evaluation with high-quality relationship data."""
        relationships = {
            "proteins": [
                RelationshipPair(relation_type="interacts_with", target_entity="enzyme_A"),
                RelationshipPair(relation_type="regulates", target_entity="gene_B"),
                RelationshipPair(relation_type="binds_to", target_entity="receptor_C"),
                RelationshipPair(relation_type="activates", target_entity="pathway_D"),
            ],
            "genes": [
                RelationshipPair(relation_type="codes_for", target_entity="protein_X"),
                RelationshipPair(relation_type="regulated_by", target_entity="transcription_factor_Y"),
                RelationshipPair(relation_type="associated_with", target_entity="disease_Z"),
            ],
            "diseases": [
                RelationshipPair(relation_type="caused_by", target_entity="mutation_M"),
                RelationshipPair(relation_type="treated_with", target_entity="drug_N"),
            ],
        }

        result = evaluate_relationships_quality(relationships)

        assert result["overall"] > 0.6, f"Expected good overall quality, got {result['overall']}"
        assert result["validity"] > 0.8
        assert result["coverage"] > 0.6
        assert result["diversity"] > 0.6
        assert result["bidirectionality"] >= 0.0

    def test_evaluate_relationships_quality_with_bidirectional(self) -> None:
        """Test that bidirectional relationships are detected and scored."""
        relationships = {
            "proteins": [
                RelationshipPair(relation_type="interacts_with", target_entity="protein_B"),
                RelationshipPair(relation_type="binds_to", target_entity="receptor_A"),
                RelationshipPair(relation_type="phosphorylates", target_entity="kinase_substrate"),
            ],
            "receptors": [
                RelationshipPair(relation_type="bound_by", target_entity="proteins"),  # Bidirectional
                RelationshipPair(relation_type="activates", target_entity="signaling_pathway"),
            ],
            "kinases": [
                RelationshipPair(relation_type="catalyzes", target_entity="phosphorylation_reaction"),
                RelationshipPair(relation_type="regulated_by", target_entity="regulatory_protein"),
            ],
            "enzymes": [
                RelationshipPair(relation_type="converts", target_entity="substrate_molecule"),
                RelationshipPair(relation_type="inhibited_by", target_entity="competitive_inhibitor"),
            ],
            "genes": [
                RelationshipPair(relation_type="codes_for", target_entity="protein_product"),
                RelationshipPair(relation_type="regulated_by", target_entity="transcription_factor"),
            ],
        }

        result = evaluate_relationships_quality(relationships)

        assert result["bidirectionality"] > 0.0, "Should detect bidirectional relationships"
        assert result["validity"] > 0.5
        assert result["coverage"] > 0.5

    def test_evaluate_relationships_quality_poor_quality(self) -> None:
        """Test evaluation with poor-quality relationship data."""
        relationships = {
            "things": [
                RelationshipPair(relation_type="", target_entity=""),  # Empty strings
                RelationshipPair(relation_type="x", target_entity="things"),  # Self-reference
            ],
        }

        result = evaluate_relationships_quality(relationships)

        assert result["overall"] < 0.5, f"Expected low overall quality, got {result['overall']}"
        assert result["validity"] < 0.4
        assert result["coverage"] < 0.5
        assert result["diversity"] < 0.5

    def test_evaluate_relationships_quality_empty_data(self) -> None:
        """Test evaluation with empty relationship data."""
        result = evaluate_relationships_quality({})

        assert result["overall"] == 0.0
        assert result["validity"] == 0.0
        assert result["coverage"] == 0.0
        assert result["diversity"] == 0.0
        assert result["bidirectionality"] == 0.0

    def test_evaluate_relationships_quality_single_category(self) -> None:
        """Test evaluation with relationships in only one category."""
        relationships = {
            "proteins": [
                RelationshipPair(relation_type="interacts_with", target_entity="protein_A"),
                RelationshipPair(relation_type="binds_to", target_entity="protein_B"),
                RelationshipPair(relation_type="activates", target_entity="protein_C"),
            ],
        }

        result = evaluate_relationships_quality(relationships)

        # Should have good validity but lower coverage/diversity
        assert result["validity"] > 0.5
        assert result["coverage"] < 0.7  # Only one category
        assert result["diversity"] > 0.3  # Good relation type diversity within category

    def test_evaluate_relationships_quality_duplicate_relations(self) -> None:
        """Test evaluation with duplicate relationship types."""
        relationships = {
            "proteins": [
                RelationshipPair(relation_type="interacts_with", target_entity="protein_A"),
                RelationshipPair(relation_type="interacts_with", target_entity="protein_B"),
                RelationshipPair(relation_type="interacts_with", target_entity="protein_C"),
            ],
        }

        result = evaluate_relationships_quality(relationships)

        # Should have lower diversity due to repeated relation types
        assert result["diversity"] < 0.5, "Should penalize lack of relation type diversity"
        assert result["validity"] > 0.0  # Still valid scientific terms

    def test_evaluate_relationships_quality_scientific_terms(self) -> None:
        """Test that scientific terminology is properly recognized."""
        relationships = {
            "biomarkers": [
                RelationshipPair(relation_type="correlates_with", target_entity="disease_progression"),
                RelationshipPair(relation_type="predicts", target_entity="clinical_outcome"),
            ],
            "enzymes": [
                RelationshipPair(relation_type="catalyzes", target_entity="biochemical_reaction"),
                RelationshipPair(relation_type="inhibited_by", target_entity="competitive_inhibitor"),
            ],
        }

        result = evaluate_relationships_quality(relationships)

        assert result["validity"] > 0.6, "Should recognize scientific terminology"
        assert result["overall"] > 0.55


class TestRelationshipsCompleteness:
    def test_check_relationships_completeness_complete(self) -> None:
        """Test completeness check with complete relationship data."""
        relationships = {
            "proteins": [
                RelationshipPair(relation_type="interacts_with", target_entity="enzyme_A"),
                RelationshipPair(relation_type="regulates", target_entity="gene_B"),
            ],
            "genes": [
                RelationshipPair(relation_type="codes_for", target_entity="protein_X"),
            ],
            "diseases": [
                RelationshipPair(relation_type="caused_by", target_entity="mutation_M"),
            ],
        }

        result = check_relationships_completeness(relationships)

        assert result["has_relationships"] is True
        assert result["has_multiple_sources"] is True
        assert result["minimum_relationships"] is True
        assert result["all_valid_structure"] is True
        assert result["has_meaningful_types"] is True

    def test_check_relationships_completeness_incomplete(self) -> None:
        """Test completeness check with incomplete relationship data."""
        relationships = {
            "proteins": [
                RelationshipPair(relation_type="", target_entity="enzyme_A"),  # Missing relation type
                RelationshipPair(relation_type="regulates", target_entity=""),  # Missing target
            ],
        }

        result = check_relationships_completeness(relationships)

        assert result["has_relationships"] is True
        assert result["has_multiple_sources"] is False  # Only one category
        assert result["minimum_relationships"] is False  # Has 2 relations but structure invalid
        assert result["all_valid_structure"] is False  # Missing relation type and target
        assert result["has_meaningful_types"] is True  # "regulates" is meaningful

    def test_check_relationships_completeness_empty(self) -> None:
        """Test completeness check with empty relationship data."""
        result = check_relationships_completeness({})

        assert result["has_relationships"] is False
        assert result["has_multiple_sources"] is False
        assert result["minimum_relationships"] is False
        assert result["all_valid_structure"] is True  # Vacuously true
        assert result["has_meaningful_types"] is False  # No types to check

    def test_check_relationships_completeness_single_relation(self) -> None:
        """Test completeness check with single relationship per category."""
        relationships = {
            "proteins": [
                RelationshipPair(relation_type="interacts_with", target_entity="enzyme_A"),
            ],
            "genes": [
                RelationshipPair(relation_type="codes_for", target_entity="protein_X"),
            ],
        }

        result = check_relationships_completeness(relationships)

        assert result["has_relationships"] is True
        assert result["has_multiple_sources"] is True
        assert result["minimum_relationships"] is False  # Only 2 total, need 3+
        assert result["all_valid_structure"] is True
        assert result["has_meaningful_types"] is True
