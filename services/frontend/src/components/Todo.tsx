'use client'

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { List, Check, Plus, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Styled Components
const TodoContainer = styled.div`
  margin-top: 1.5rem;
  border-top: 1px solid rgba(136, 80, 242, 0.1);
  padding-top: 1.5rem;
`;

const TodoHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const TodoTitle = styled.h4`
  color: #FFFFFF;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TodoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const TodoItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(20, 20, 24, 0.5);
  border-radius: 8px;
`;

const TodoCheckbox = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid #A855F7;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  cursor: pointer;
`;

const TodoText = styled.div`
  color: #FFFFFF;
  font-size: 0.875rem;
  flex: 1;
`;

const TodoActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: #8D8D99;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #FFFFFF;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const AddTodoForm = styled.form`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
`;

const TodoInput = styled.input`
  flex: 1;
  background: rgba(20, 20, 24, 0.5);
  border: 1px solid rgba(136, 80, 242, 0.2);
  border-radius: 8px;
  padding: 0.75rem;
  color: #FFFFFF;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: rgba(136, 80, 242, 0.4);
  }
  
  &::placeholder {
    color: #8D8D99;
  }
`;

const AddButton = styled.button`
  background: linear-gradient(135deg, #8850F2 0%, #A855F7 100%);
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #FFFFFF;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface TodoProps {
  transcriptionId: string;
  initialTodos?: { text: string; completed: boolean }[];
  onTodosChange?: (todos: { text: string; completed: boolean }[]) => void;
}

export const Todo: React.FC<TodoProps> = ({ 
  transcriptionId, 
  initialTodos = [],
  onTodosChange
}) => {
  const [todos, setTodos] = useState<{ text: string; completed: boolean }[]>(initialTodos);
  const [newTodo, setNewTodo] = useState('');
  
  // Initialize todos from localStorage if available
  useEffect(() => {
    const storedTodos = localStorage.getItem(`todos-${transcriptionId}`);
    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    } else if (initialTodos.length > 0) {
      setTodos(initialTodos);
    }
  }, [transcriptionId, initialTodos]);
  
  // Update localStorage and call onTodosChange when todos change
  useEffect(() => {
    localStorage.setItem(`todos-${transcriptionId}`, JSON.stringify(todos));
    if (onTodosChange) {
      onTodosChange(todos);
    }
  }, [todos, transcriptionId, onTodosChange]);
  
  const toggleTodo = (index: number) => {
    setTodos(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        completed: !updated[index].completed
      };
      return updated;
    });
  };
  
  const deleteTodo = (index: number) => {
    setTodos(prev => prev.filter((_, i) => i !== index));
  };
  
  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      setTodos(prev => [
        ...prev, 
        { text: newTodo.trim(), completed: false }
      ]);
      setNewTodo('');
    }
  };
  
  return (
    <TodoContainer>
      <TodoHeader>
        <TodoTitle>
          <List size={18} />
          To-Do List
        </TodoTitle>
      </TodoHeader>
      
      <TodoList>
        <AnimatePresence>
          {todos.map((todo, index) => (
            <TodoItem 
              key={`${index}-${todo.text}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TodoCheckbox 
                onClick={() => toggleTodo(index)}
              >
                {todo.completed && <Check size={14} />}
              </TodoCheckbox>
              <TodoText style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                {todo.text}
              </TodoText>
              <TodoActions>
                <ActionButton onClick={() => deleteTodo(index)}>
                  <Trash size={16} />
                </ActionButton>
              </TodoActions>
            </TodoItem>
          ))}
        </AnimatePresence>
      </TodoList>
      
      <AddTodoForm onSubmit={addTodo}>
        <TodoInput 
          type="text" 
          value={newTodo} 
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new task..."
        />
        <AddButton type="submit" disabled={!newTodo.trim()}>
          <Plus size={16} />
          Add
        </AddButton>
      </AddTodoForm>
    </TodoContainer>
  );
};

export default Todo; 