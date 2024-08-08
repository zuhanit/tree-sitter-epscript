package tree_sitter_epscript_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-epscript"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_epscript.Language())
	if language == nil {
		t.Errorf("Error loading Epscript grammar")
	}
}
