const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('audit_logs', {
            id: {
                type: DataTypes.UUID,
                defaultValue: Sequelize.literal('uuid_generate_v4()'),
                primaryKey: true
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                }
            },
            action: {
                type: DataTypes.STRING,
                allowNull: false
            },
            resource: {
                type: DataTypes.STRING,
                allowNull: false
            },
            outcome: {
                type: DataTypes.STRING,
                allowNull: false
            },
            details: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            patient_id: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'patients',
                    key: 'id'
                }
            },
            ip_address: {
                type: DataTypes.STRING,
                allowNull: true
            },
            user_agent: {
                type: DataTypes.STRING,
                allowNull: true
            },
            timestamp: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Add indexes for better query performance
        await queryInterface.addIndex('audit_logs', ['user_id']);
        await queryInterface.addIndex('audit_logs', ['patient_id']);
        await queryInterface.addIndex('audit_logs', ['timestamp']);
        await queryInterface.addIndex('audit_logs', ['action']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('audit_logs');
    }
};
