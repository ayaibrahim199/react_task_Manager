const Task = require('../models/Task');

exports.createTask = async (req, res) => {
    try {
        const payload = { ...req.body, user: req.user._id };

        if (payload.dueDate) {
            const due = new Date(payload.dueDate);
            const now = new Date();
            if (isNaN(due.getTime()) || due < now) {
                return res.status(400).json({ message: 'Validation failed', errors: [{ field: 'dueDate', message: 'Due date must be later than now' }] });
            }
        }

        const task = await Task.create(payload);
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user._id });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateTask = async (req, res) => {
    try {
      // Find the task first to validate against createdAt
      const existing = await Task.findOne({ _id: req.params.id, user: req.user._id });
      if (!existing) return res.status(404).json({ message: 'Task not found' });

      const updates = { ...req.body };

      if (updates.dueDate !== undefined && updates.dueDate !== null) {
        const due = new Date(updates.dueDate);
        if (isNaN(due.getTime()) || due < existing.createdAt) {
          return res.status(400).json({ message: 'Validation failed', errors: [{ field: 'dueDate', message: 'Due date cannot be earlier than creation time' }] });
        }
      }

      const task = await Task.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        updates,
        { new: true }
      );
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
exports.deleteTask = async (req, res) => {
    try {
        // Find the task by its ID and the user's ID to ensure ownership.
        const result = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });

        if (!result) {
            // If the task wasn't found or the user is not the owner, return a 404.
            return res.status(404).json({ message: 'Task not found or unauthorized' });
        }
        
        // If the task was successfully deleted, return a success message.
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        // Handle any server-side errors.
        res.status(500).json({ message: error.message });
    }
};
